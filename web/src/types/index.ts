// API type definitions matching the Rust backend

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  icon: string | null;
  created_at: string;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}

export interface Container {
  id: string;
  name: string;
  label: string | null;
  description: string | null;
  container_type: string;
  parent_id: string | null;
  image_path: string | null;
  created_at: string;
}

export interface ContainerNode extends Container {
  children: ContainerNode[];
}

export interface PathSegment {
  id: string;
  name: string;
}

export interface ContainerDetail {
  container: Container;
  path: PathSegment[];
  children: Container[];
  items: ItemSummary[];
}

export interface Item {
  id: string;
  name: string;
  description: string | null;
  source_type: string;
  purchased_at: string | null;
  bought_from: string | null;
  price: number | null;
  category_id: string | null;
  container_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemSummary {
  id: string;
  name: string;
  description: string | null;
  source_type: string;
  category_id: string | null;
  category_name: string | null;
  container_id: string | null;
  container_path: PathSegment[];
  thumb_path: string | null;
  created_at: string;
}

export interface ItemImage {
  id: string;
  item_id: string;
  file_path: string;
  thumb_path: string;
  sort_order: number;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface ItemDetail {
  item: Item;
  category_name: string | null;
  container_path: PathSegment[];
  images: ItemImage[];
  tags: Tag[];
  documents: ItemDocument[];
}

export interface ItemDocument {
  id: string;
  item_id: string;
  file_path: string;
  filename: string;
  doc_type: string;
  created_at: string;
}

export interface PaginatedItems {
  items: ItemSummary[];
  total: number;
  page: number;
  size: number;
}

export interface SearchHit {
  item: ItemSummary;
  highlight: string | null;
}

export interface SearchResult {
  items: SearchHit[];
  total: number;
  page: number;
  size: number;
}

export interface Stats {
  total_items: number;
  total_containers: number;
  total_categories: number;
  total_tags: number;
}

export interface CreateItem {
  name: string;
  description?: string;
  source_type?: string;
  purchased_at?: string;
  bought_from?: string;
  price?: number;
  category_id?: string;
  container_id?: string;
  tag_ids?: string[];
}

export interface UpdateItem {
  name?: string;
  description?: string;
  source_type?: string;
  purchased_at?: string;
  bought_from?: string;
  price?: number;
  category_id?: string;
  container_id?: string;
  tag_ids?: string[];
}

export interface CreateCategory {
  name: string;
  parent_id?: string;
  icon?: string;
}

export interface CreateContainer {
  name: string;
  label?: string;
  description?: string;
  container_type?: string;
  parent_id?: string;
}

export interface ListItemsQuery {
  category_id?: string;
  container_id?: string;
  source_type?: string;
  tag_id?: string;
  page?: number;
  size?: number;
}

export interface SearchQuery {
  q: string;
  category_id?: string;
  container_id?: string;
  source_type?: string;
  page?: number;
  size?: number;
}
