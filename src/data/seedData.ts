import { Client, Product, Project, Task } from '@/types/domain';

export function createInitialSeedData(): {
  products: Product[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
} {
  return {
    products: [],
    clients: [],
    projects: [],
    tasks: [],
  };
}
