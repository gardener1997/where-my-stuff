use serde::{Deserialize, Serialize};

use super::item::ItemSummary;

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: String,
    pub category_id: Option<String>,
    pub container_id: Option<String>,
    pub source_type: Option<String>,
    pub page: Option<i64>,
    pub size: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub items: Vec<SearchHit>,
    pub total: i64,
    pub page: i64,
    pub size: i64,
}

#[derive(Debug, Serialize)]
pub struct SearchHit {
    pub item: ItemSummary,
    pub highlight: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Stats {
    pub total_items: i64,
    pub total_containers: i64,
    pub total_categories: i64,
    pub total_tags: i64,
}
