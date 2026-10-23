import { notFound } from 'next/navigation';
import { requirePageUser } from '@/server/auth/pageAuth';
import {
  canManageCourses,
  getProgramDetail,
  getProgramRowBySlug,
  userCanViewProgram,
} from '@/server/domain/coursePrograms';
import { listStudentAssessmentResults } from '@/server/domain/courseAssessments';
import { canManageMeetings, listWeeklyMeetingsForProgram } from '@/server/domain/weeklyMeetings';
import { CourseProgramWorkspace } from '@/components/courses/CourseProgramWorkspace';

export const dynamic = 'force-dynamic';

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requirePageUser();
  const { slug } = await params;
  const program = getProgramRowBySlug(slug);
  if (!program) notFound();
  if (!userCanViewProgram(user, program)) notFound();

  const isStaff = canManageCourses(user);
  const detail = getProgramDetail(program, { userId: user.id, includeStaffMaterials: isStaff });
  const results = listStudentAssessmentResults(program.id, user);
  const manageMeetings = canManageMeetings(user);
  const meetings = listWeeklyMeetingsForProgram(program.id, {
    includeUnpublished: manageMeetings,
    includeHost: manageMeetings,
  });

  return (
    <CourseProgramWorkspace
      slug={slug}
      detail={detail}
      results={results}
      isStaff={isStaff}
      meetings={meetings}
      canManageMeetings={manageMeetings}
    />
  );
}
