use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Container {
    pub id: String,
    pub name: String,
    pub label: Option<String>,
    pub description: Option<String>,
    pub container_type: String,
    pub parent_id: Option<String>,
    pub image_path: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateContainer {
    pub name: String,
    pub label: Option<String>,
    pub description: Option<String>,
    pub container_type: Option<String>,
    pub parent_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContainer {
    pub name: Option<String>,
    pub label: Option<String>,
    pub description: Option<String>,
    pub container_type: Option<String>,
    pub parent_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ContainerNode {
    #[serde(flatten)]
    pub container: Container,
    pub children: Vec<ContainerNode>,
}

#[derive(Debug, Serialize)]
pub struct ContainerDetail {
    pub container: Container,
    pub path: Vec<PathSegment>,
    pub children: Vec<Container>,
    pub items: Vec<super::item::ItemSummary>,
}

#[derive(Debug, Serialize)]
pub struct PathSegment {
    pub id: String,
    pub name: String,
}
