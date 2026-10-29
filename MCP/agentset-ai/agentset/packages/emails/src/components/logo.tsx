import { Img, Link } from "@react-email/components";

export const Logo = () => {
  return (
    <Link href="https://agentset.ai">
      <Img
        src="https://assets.agentset.ai/logo-full.png"
        height="40"
        alt="Agentset"
      />
    </Link>
  );
};
