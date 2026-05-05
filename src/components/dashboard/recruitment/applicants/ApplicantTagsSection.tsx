import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { TagChip, TagPicker } from './TagPicker';
import {
  useApplicantTags,
  useAddApplicantTag,
  useRemoveApplicantTag,
} from '@/hooks/recruitment/useApplicantTags';

interface Props {
  applicantId: string;
}

export function ApplicantTagsSection({ applicantId }: Props) {
  const { data: links, isLoading } = useApplicantTags(applicantId);
  const addMut = useAddApplicantTag();
  const removeMut = useRemoveApplicantTag();

  if (isLoading) return <Skeleton className="h-6 w-48" />;

  const linkedTagIds = (links ?? [])
    .filter((l) => l.recruitment_tags)
    .map((l) => l.recruitment_tags!.id);

  const handleChange = (next: string[]) => {
    const nextSet = new Set(next);
    const currentSet = new Set(linkedTagIds);
    // Adds
    for (const id of next) {
      if (!currentSet.has(id)) {
        addMut.mutate({ applicant_id: applicantId, tag_id: id });
      }
    }
    // Removes
    for (const id of linkedTagIds) {
      if (!nextSet.has(id)) {
        removeMut.mutate({ applicant_id: applicantId, tag_id: id });
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(links ?? []).map(
        (l) =>
          l.recruitment_tags && (
            <TagChip
              key={l.id}
              tag={l.recruitment_tags}
              onRemove={() =>
                removeMut.mutate({
                  applicant_id: applicantId,
                  tag_id: l.recruitment_tags!.id,
                })
              }
            />
          )
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            <Plus className="h-3 w-3" />
            Etikett
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="p-2">
            <TagPicker
              value={linkedTagIds}
              onChange={handleChange}
              showSelected={false}
              triggerLabel="Velg etiketter"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
