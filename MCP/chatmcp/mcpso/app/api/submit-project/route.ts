import { parseProject, saveProject } from "@/services/project";
import { respData, respErr } from "@/utils/resp";

import { Project } from "@/types/project";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    let project: Project = await req.json();

    const parsedProject = parseProject(project);
    if (!parsedProject) {
      return respErr("invalid project");
    }

    const savedProject = await saveProject(parsedProject);
    if (!savedProject) {
      return respErr("save project failed");
    }

    return respData(savedProject);
  } catch (e) {
    console.log("submit project failed", e);
    return respErr("submit project failed");
  }
}
