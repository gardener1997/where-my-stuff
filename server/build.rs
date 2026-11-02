fn main() {
    // `rust_embed` bakes `web/dist` into the binary at compile time, but Cargo
    // cannot see files added there on its own. Rebuild whenever the frontend
    // bundle changes so the served assets never go stale.
    println!("cargo:rerun-if-changed=../web/dist");
}
