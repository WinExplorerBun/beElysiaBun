-- Enable UUID extension for better scalability
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create folders table with hierarchical structure
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES folders(id),
    path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Add constraints
    CONSTRAINT folder_name_length CHECK (char_length(name) > 0),
    CONSTRAINT folder_path_length CHECK (char_length(path) > 0)
);

-- Create index for better query performance
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_path ON folders USING btree(path);
CREATE INDEX idx_folders_name ON folders(name);

-- Create files table (for bonus feature)
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    folder_id UUID NOT NULL REFERENCES folders(id),
    size BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(127),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Add constraints
    CONSTRAINT file_name_length CHECK (char_length(name) > 0),
    CONSTRAINT file_size_positive CHECK (size >= 0)
);

-- Create index for files
CREATE INDEX idx_files_folder_id ON files(folder_id);
CREATE INDEX idx_files_name ON files(name);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_folders_modtime
    BEFORE UPDATE ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_modtime
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create materialized view for folder paths (improves query performance for deep hierarchies)
CREATE MATERIALIZED VIEW folder_paths AS
WITH RECURSIVE folder_tree AS (
    -- Base case: root folders
    SELECT id, name, parent_id, path, 1 as level
    FROM folders
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case: child folders
    SELECT f.id, f.name, f.parent_id, f.path, ft.level + 1
    FROM folders f
    INNER JOIN folder_tree ft ON ft.id = f.parent_id
)
SELECT id, name, parent_id, path, level
FROM folder_tree;

-- Create index on materialized view
CREATE INDEX idx_folder_paths_level ON folder_paths(level);