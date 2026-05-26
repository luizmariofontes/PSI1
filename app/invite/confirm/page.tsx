import { InviteConfirmationPage } from '@/components/auth/invite-confirmation-page'

interface ConfirmInvitePageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function ConfirmInvitePage({ searchParams }: ConfirmInvitePageProps) {
  const params = await searchParams
  return <InviteConfirmationPage token={params.token || ''} />
}
