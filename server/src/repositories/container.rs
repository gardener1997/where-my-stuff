use sqlx::SqlitePool;

use crate::error::{AppError, AppResult};
use crate::models::{Container, ContainerNode, CreateContainer, PathSegment, UpdateContainer};

pub async fn list(pool: &SqlitePool, parent_id: Option<&str>) -> AppResult<Vec<Container>> {
    let rows = match parent_id {
        Some(pid) => sqlx::query_as::<_, Container>(
            "SELECT id, name, label, description, container_type, parent_id, image_path, created_at
                 FROM containers WHERE parent_id = ? ORDER BY name",
        )
        .bind(pid)
        .fetch_all(pool)
        .await?,
        None => sqlx::query_as::<_, Container>(
            "SELECT id, name, label, description, container_type, parent_id, image_path, created_at
                 FROM containers ORDER BY name",
        )
        .fetch_all(pool)
        .await?,
    };
    Ok(rows)
}

pub async fn list_tree(pool: &SqlitePool) -> AppResult<Vec<ContainerNode>> {
    let all = list(pool, None).await?;
    Ok(build_tree(all))
}

pub async fn get(pool: &SqlitePool, id: &str) -> AppResult<Container> {
    sqlx::query_as::<_, Container>(
        "SELECT id, name, label, description, container_type, parent_id, image_path, created_at
         FROM containers WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::not_found(format!("container {id} not found")))
}

/// Get the ancestor path from root to the given container.
pub async fn get_path(pool: &SqlitePool, id: &str) -> AppResult<Vec<PathSegment>> {
    let mut path = vec![];
    let mut current_id = Some(id.to_string());
    while let Some(cid) = current_id {
        let c = get(pool, &cid).await?;
        path.push(PathSegment {
            id: c.id.clone(),
            name: c.name,
        });
        current_id = c.parent_id;
    }
    path.reverse();
    Ok(path)
}

pub async fn create(pool: &SqlitePool, input: &CreateContainer) -> AppResult<Container> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO containers (id, name, label, description, container_type, parent_id)
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&input.name)
    .bind(&input.label)
    .bind(&input.description)
    .bind(input.container_type.as_deref().unwrap_or("other"))
    .bind(&input.parent_id)
    .execute(pool)
    .await?;
    get(pool, &id).await
}

pub async fn update(pool: &SqlitePool, id: &str, input: &UpdateContainer) -> AppResult<Container> {
    let existing = get(pool, id).await?;
    sqlx::query(
        "UPDATE containers SET name = ?, label = ?, description = ?, container_type = ?, parent_id = ?
         WHERE id = ?",
    )
    .bind(input.name.as_deref().unwrap_or(&existing.name))
    .bind(input.label.as_deref().or(existing.label.as_deref()))
    .bind(input.description.as_deref().or(existing.description.as_deref()))
    .bind(input.container_type.as_deref().unwrap_or(&existing.container_type))
    .bind(input.parent_id.as_deref().or(existing.parent_id.as_deref()))
    .bind(id)
    .execute(pool)
    .await?;
    get(pool, id).await
}

pub async fn delete(pool: &SqlitePool, id: &str) -> AppResult<()> {
    sqlx::query("UPDATE items SET container_id = NULL WHERE container_id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    sqlx::query("UPDATE containers SET parent_id = NULL WHERE parent_id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    sqlx::query("DELETE FROM containers WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn set_image(pool: &SqlitePool, id: &str, path: &str) -> AppResult<()> {
    sqlx::query("UPDATE containers SET image_path = ? WHERE id = ?")
        .bind(path)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

fn build_tree(flat: Vec<Container>) -> Vec<ContainerNode> {
    let mut nodes: Vec<ContainerNode> = flat
        .into_iter()
        .map(|c| ContainerNode {
            container: c,
            children: vec![],
        })
        .collect();

    nodes.sort_by(|a, b| a.container.name.cmp(&b.container.name));

    let ids: Vec<String> = nodes.iter().map(|n| n.container.id.clone()).collect();
    let mut children_map: std::collections::HashMap<String, Vec<ContainerNode>> =
        std::collections::HashMap::new();
    let mut roots: Vec<ContainerNode> = vec![];

    for node in nodes {
        match &node.container.parent_id {
            Some(pid) if ids.contains(pid) => {
                children_map.entry(pid.clone()).or_default().push(node);
            }
            _ => roots.push(node),
        }
    }

    fn attach(
        node: &mut ContainerNode,
        map: &mut std::collections::HashMap<String, Vec<ContainerNode>>,
    ) {
        if let Some(children) = map.remove(&node.container.id) {
            for mut child in children {
                attach(&mut child, map);
                node.children.push(child);
            }
        }
    }

    for root in &mut roots {
        attach(root, &mut children_map);
    }

    roots
}
