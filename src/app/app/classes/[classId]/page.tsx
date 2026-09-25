import { ClassDetail } from "@/features/classes/class-detail";

export default async function ClassPage({ params }: PageProps<"/app/classes/[classId]">) {
  const { classId } = await params;
  return <ClassDetail classId={classId} />;
}
