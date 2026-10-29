import { respData, respErr } from "@/utils/resp";

import { findProjectByName } from "@/models/project";
import { sumProject } from "@/services/project";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    let { name } = await req.json();
    if (!name) {
      return respErr("name is required");
    }

    const project = await findProjectByName(name);
    if (!project || !project.uuid || !project.url) {
      return respErr("invalid project");
    }

    const summarizedProject = await sumProject(project);

    return respData(summarizedProject);
  } catch (e) {
    console.log("summarize project failed: ", e);
    return respErr("summarize project failed");
  }
}
