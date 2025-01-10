export interface Project {
    id: string;
    name: string;
    description: string;
    owner: string;
    owner_id: string;
    private: boolean;
    access_ids: string[];
}
