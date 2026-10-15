import { CATEGORY_LABEL, type Category } from '@/lib/constants';
import { Icon, type IconName } from './Icon';

export const CATEGORY_ICON: Record<Category, IconName> = {
  technical: 'gear',
  market: 'chart',
  social: 'people',
  financial: 'coin',
  legal: 'scale',
  scalability: 'expand',
  competition: 'swords',
};

/** Category chip: icon AND text (never colour alone). */
export function CategoryTag({ category }: { category: Category }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(112,52,58,0.9)] bg-[#2a0b0f] px-2.5 py-1 font-label text-xs font-semibold uppercase tracking-wider text-ash">
      <Icon name={CATEGORY_ICON[category]} size={14} />
      {CATEGORY_LABEL[category]}
    </span>
  );
}
