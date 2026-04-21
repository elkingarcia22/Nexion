import { redirect } from 'next/navigation'

// Root — redirect to the operational home
export default function RootPage() {
  redirect('/day/today')
}
