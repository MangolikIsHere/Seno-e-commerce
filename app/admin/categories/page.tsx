import { getAdminCategories } from '@/lib/categories'
import { CategoriesClient } from './CategoriesClient'

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  return <CategoriesClient initialCategories={await getAdminCategories()} />
}