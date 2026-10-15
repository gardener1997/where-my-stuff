use sqlx::SqlitePool;

use crate::error::{AppError, AppResult};
use crate::models::{Category, CategoryNode, CreateCategory, UpdateCategory};

pub async fn list(pool: &SqlitePool) -> AppResult<Vec<Category>> {
    let rows = sqlx::query_as::<_, Category>(
        "SELECT id, name, parent_id, icon, created_at FROM categories ORDER BY name",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn list_tree(pool: &SqlitePool) -> AppResult<Vec<CategoryNode>> {
    let all = list(pool).await?;
    Ok(build_tree(all))
}

pub async fn get(pool: &SqlitePool, id: &str) -> AppResult<Category> {
    sqlx::query_as::<_, Category>(
        "SELECT id, name, parent_id, icon, created_at FROM categories WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::not_found(format!("category {id} not found")))
}

pub async fn create(pool: &SqlitePool, input: &CreateCategory) -> AppResult<Category> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO categories (id, name, parent_id, icon) VALUES (?, ?, ?, ?)")
        .bind(&id)
        .bind(&input.name)
        .bind(&input.parent_id)
        .bind(&input.icon)
        .execute(pool)
        .await?;
    get(pool, &id).await
}

pub async fn update(pool: &SqlitePool, id: &str, input: &UpdateCategory) -> AppResult<Category> {
    let existing = get(pool, id).await?;
    sqlx::query("UPDATE categories SET name = ?, parent_id = ?, icon = ? WHERE id = ?")
        .bind(input.name.as_deref().unwrap_or(&existing.name))
        .bind(input.parent_id.as_deref().or(existing.parent_id.as_deref()))
        .bind(input.icon.as_deref().or(existing.icon.as_deref()))
        .bind(id)
        .execute(pool)
        .await?;
    get(pool, id).await
}

pub async fn delete(pool: &SqlitePool, id: &str) -> AppResult<()> {
    sqlx::query("UPDATE items SET category_id = NULL WHERE category_id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    sqlx::query("UPDATE categories SET parent_id = NULL WHERE parent_id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    sqlx::query("DELETE FROM categories WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

fn build_tree(flat: Vec<Category>) -> Vec<CategoryNode> {
    let mut nodes: Vec<CategoryNode> = flat
        .into_iter()
        .map(|c| CategoryNode {
            category: c,
            children: vec![],
        })
        .collect();

    // Sort by name for deterministic tree
    nodes.sort_by(|a, b| a.category.name.cmp(&b.category.name));

    // Build tree: move children under parents
    let ids: Vec<String> = nodes.iter().map(|n| n.category.id.clone()).collect();
    let mut children_map: std::collections::HashMap<String, Vec<CategoryNode>> =
        std::collections::HashMap::new();
    let mut roots: Vec<CategoryNode> = vec![];

    // Separate roots from children
    let mut remaining: Vec<CategoryNode> = vec![];
    for node in nodes {
        match &node.category.parent_id {
            Some(pid) if ids.contains(pid) => {
                children_map.entry(pid.clone()).or_default().push(node);
            }
            _ => roots.push(node),
        }
    }

    // Attach children recursively
    fn attach(
        node: &mut CategoryNode,
        map: &mut std::collections::HashMap<String, Vec<CategoryNode>>,
    ) {
        if let Some(children) = map.remove(&node.category.id) {
            for mut child in children {
                attach(&mut child, map);
                node.children.push(child);
            }
        }
    }

    for root in &mut roots {
        attach(root, &mut children_map);
    }

    roots.append(&mut remaining);
    roots
}
