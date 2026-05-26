import PostReviewer from '@/components/PostReviewer'

export const metadata = {
  title: 'Approval queue · Social',
}

interface SP {
  searchParams: Promise<{ post?: string }>
}

export default async function Page({ searchParams }: SP) {
  const sp = await searchParams
  return <PostReviewer postId={sp.post} />
}
