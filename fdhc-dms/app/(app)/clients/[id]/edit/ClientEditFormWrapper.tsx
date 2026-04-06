'use client'

import { useRouter } from 'next/navigation'
import ClientEditForm from '@/components/ClientEditForm'

interface Props {
  client: Record<string, unknown>
}

export default function ClientEditFormWrapper({ client }: Props) {
  const router = useRouter()

  return (
    <ClientEditForm
      client={{
        id: client.id as string,
        first_name: (client.first_name as string) || '',
        last_name: (client.last_name as string) || '',
        email: (client.email as string) || '',
        phone: (client.phone as string) || '',
        address: (client.address as string) || '',
        delivery_address: (client.delivery_address as string) || '',
        delivery_city: (client.delivery_city as string) || '',
        delivery_state: (client.delivery_state as string) || '',
        delivery_zip: (client.delivery_zip as string) || '',
        delivery_county: (client.delivery_county as string) || '',
        source: (client.source as string) || '',
        status: (client.status as string) || 'lead',
        land_status: (client.land_status as string) || 'unknown',
        tags: Array.isArray(client.tags) ? (client.tags as string[]) : [],
      }}
      onSave={() => {
        router.push(`/clients/${client.id}`)
      }}
    />
  )
}
