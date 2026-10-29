import { Category } from "@/types/category";
import { Project } from "@/types/project";
import ProjectDetail from "@/templates/tailspark/landing/components/project";

export default function ({
  project,
  more_projects,
  category,
}: {
  project: Project;
  more_projects: Project[];
  category?: Category;
}) {
  return (
    <>
      {project && (
        <ProjectDetail
          category={category}
          project={project}
          more_projects={more_projects}
        />
      )}
    </>
  );
}
