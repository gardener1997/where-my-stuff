use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Item {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub source_type: String,
    pub purchased_at: Option<String>,
    pub bought_from: Option<String>,
    pub price: Option<f64>,
    pub category_id: Option<String>,
    pub container_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct ItemSummary {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub source_type: String,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    pub container_id: Option<String>,
    pub container_path: Vec<super::container::PathSegment>,
    pub thumb_path: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct ItemDetail {
    pub item: Item,
    pub category_name: Option<String>,
    pub container_path: Vec<super::container::PathSegment>,
    pub images: Vec<ItemImage>,
    pub tags: Vec<super::tag::Tag>,
    pub documents: Vec<ItemDocument>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ItemImage {
    pub id: String,
    pub item_id: String,
    pub file_path: String,
    pub thumb_path: String,
    pub sort_order: i32,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ItemDocument {
    pub id: String,
    pub item_id: String,
    pub file_path: String,
    pub filename: String,
    pub doc_type: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateItem {
    pub name: String,
    pub description: Option<String>,
    pub source_type: Option<String>,
    pub purchased_at: Option<String>,
    pub bought_from: Option<String>,
    pub price: Option<f64>,
    pub category_id: Option<String>,
    pub container_id: Option<String>,
    pub tag_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateItem {
    pub name: Option<String>,
    pub description: Option<String>,
    pub source_type: Option<String>,
    pub purchased_at: Option<String>,
    pub bought_from: Option<String>,
    pub price: Option<f64>,
    pub category_id: Option<String>,
    pub container_id: Option<String>,
    pub tag_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct ListItemsQuery {
    pub category_id: Option<String>,
    pub container_id: Option<String>,
    pub source_type: Option<String>,
    pub tag_id: Option<String>,
    pub page: Option<i64>,
    pub size: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedItems {
    pub items: Vec<ItemSummary>,
    pub total: i64,
    pub page: i64,
    pub size: i64,
}
