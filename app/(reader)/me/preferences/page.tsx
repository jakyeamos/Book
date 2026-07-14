import { ReaderAccountStub } from "@/components/reader/ReaderAccountStub";

export const dynamic = "force-dynamic";

export default function ReaderPreferencesPage(): React.ReactElement {
  return <ReaderAccountStub title="Preferences" description="Audio, ambience, text scale, and reduced-motion choices will follow you between chapters." />;
}
