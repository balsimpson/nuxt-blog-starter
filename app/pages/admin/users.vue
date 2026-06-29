<template>
  <main class="min-h-screen bg-default px-6 py-12 sm:px-8">
    <div class="mx-auto w-full max-w-5xl">
      <header class="flex flex-col gap-5 border-b border-default pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="font-mono text-[11px] uppercase tracking-[0.2em] text-dimmed">
            Admin area
          </p>
          <h1 class="mt-3 font-serif text-4xl tracking-tight text-highlighted">
            Users
          </h1>
          <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
            Invite people, assign their access level, and manage active accounts.
          </p>
        </div>

        <UButton
          to="/admin"
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-left"
        >
          Back to posts
        </UButton>
      </header>

      <section class="border-b border-default py-8">
        <div class="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
          <form
            class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end"
            @submit.prevent="inviteUser"
          >
            <UFormField
              label="Email address"
              required
            >
              <UInput
                v-model="inviteForm.email"
                type="email"
                autocomplete="email"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Role"
              required
            >
              <USelect
                v-model="inviteForm.role"
                :items="roleOptions"
                class="w-full"
              />
            </UFormField>

            <UButton
              type="submit"
              icon="i-lucide-send"
              :loading="isInviting"
              :disabled="!inviteForm.email.trim()"
            >
              Send invite
            </UButton>
          </form>

          <div class="space-y-2 text-sm leading-relaxed text-muted">
            <p>
              {{ selectedRoleDescription }}
            </p>
            <p>
              Testing without an inbox? Invite an address such as
              <span class="font-mono text-xs text-highlighted">user+clerk_test@example.com</span>
              and use verification code
              <span class="font-mono text-xs text-highlighted">424242</span>.
            </p>
          </div>
        </div>
      </section>

      <section class="py-8">
        <div class="mb-4 flex items-center justify-between gap-4">
          <h2 class="font-serif text-2xl tracking-tight text-highlighted">
            Access list
          </h2>
          <span class="font-mono text-xs tabular-nums text-dimmed">
            {{ users?.length || 0 }} {{ users?.length === 1 ? 'user' : 'users' }}
          </span>
        </div>

        <div
          v-if="isPending"
          class="divide-y divide-default border-y border-default"
        >
          <div
            v-for="index in 3"
            :key="index"
            class="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_10rem_8rem_auto] sm:items-center"
          >
            <USkeleton class="h-5 w-48" />
            <USkeleton class="h-8 w-32" />
            <USkeleton class="h-5 w-20" />
            <USkeleton class="h-8 w-24" />
          </div>
        </div>

        <div
          v-else-if="users?.length"
          class="divide-y divide-default border-y border-default"
        >
          <div
            v-for="user in users"
            :key="user._id"
            class="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_10rem_8rem_auto] sm:items-center"
          >
            <div class="min-w-0">
              <p class="truncate font-medium text-highlighted">
                {{ displayName(user) }}
              </p>
              <p class="mt-1 truncate text-sm text-muted">
                {{ user.email }}
              </p>
            </div>

            <USelect
              :model-value="roleDrafts[user._id] || user.role"
              :items="roleOptions"
              :disabled="busyUsers.has(user._id)"
              @update:model-value="value => changeRole(user, value)"
            />

            <UBadge
              :color="statusColor(user.status)"
              variant="soft"
              class="w-fit capitalize"
            >
              {{ user.status }}
            </UBadge>

            <div class="flex flex-wrap justify-start gap-1 sm:justify-end">
              <template v-if="user.status === 'pending'">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-send"
                  :loading="busyUsers.has(user._id)"
                  @click="resendInvitation(user._id)"
                >
                  Resend
                </UButton>
                <UButton
                  color="error"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-x"
                  :loading="busyUsers.has(user._id)"
                  @click="revokeInvitation(user._id)"
                >
                  Revoke
                </UButton>
              </template>

              <UButton
                v-else-if="user.status === 'active'"
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-user-x"
                :loading="busyUsers.has(user._id)"
                @click="setDisabled(user._id, true)"
              >
                Disable
              </UButton>

              <UButton
                v-else
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-user-check"
                :loading="busyUsers.has(user._id)"
                @click="setDisabled(user._id, false)"
              >
                Restore
              </UButton>
            </div>
          </div>
        </div>

        <div
          v-else
          class="border-y border-default py-12 text-center"
        >
          <p class="font-serif text-2xl italic text-dimmed">
            No users yet
          </p>
          <p class="mt-2 text-sm text-muted">
            Send the first invitation using the form above.
          </p>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { Id } from '~~/convex/_generated/dataModel'
import { api } from '~~/convex/_generated/api'
import type { UserRole } from '#shared/admin-access'

type ManagedUser = {
  _id: Id<'users'>
  email: string
  role: UserRole
  status: 'pending' | 'active' | 'disabled'
  firstName?: string
  lastName?: string
}

const roleOptions = [
  { label: 'Viewer', value: 'viewer' },
  { label: 'Editor', value: 'editor' },
  { label: 'Admin', value: 'admin' }
]

const roleDescriptions: Record<UserRole, string> = {
  viewer: 'Viewers can read the post archive but cannot create, edit, or delete content.',
  editor: 'Editors can create, edit, publish, and delete posts.',
  admin: 'Admins have full content access and can invite or manage other users.'
}

const inviteForm = reactive({
  email: '',
  role: 'viewer' as UserRole
})
const roleDrafts = reactive<Record<string, UserRole>>({})
const isInviting = ref(false)
const busyUsers = reactive(new Set<string>())
const toast = useToast()
const convex = useConvexClient()
const { data: users, isPending } = useConvexQuery(
  api.adminUsers.list,
  {},
  { server: false }
)
const { mutate: updateRole } = useConvexMutation(api.adminUsers.updateRole)
const { mutate: updateDisabled } = useConvexMutation(api.adminUsers.setDisabled)

const selectedRoleDescription = computed(() =>
  roleDescriptions[inviteForm.role]
)

watch(users, (currentUsers) => {
  for (const user of currentUsers || []) {
    if (!roleDrafts[user._id]) roleDrafts[user._id] = user.role
  }
}, { immediate: true })

function displayName(user: ManagedUser) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
  return name || user.email
}

function statusColor(status: ManagedUser['status']) {
  if (status === 'active') return 'success'
  if (status === 'disabled') return 'error'
  return 'neutral'
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The request could not be completed.'
}

async function inviteUser() {
  isInviting.value = true

  try {
    const result = await convex.action(api.adminUsers.invite, {
      email: inviteForm.email,
      role: inviteForm.role
    })

    inviteForm.email = ''
    toast.add({
      title: result.emailSent ? 'Invitation sent' : 'Access saved',
      description: result.emailSent
        ? 'The person can accept the Clerk invitation or sign up directly with the same verified email.'
        : 'The role is saved, but Clerk could not send the email. The person can still sign up directly with the same verified email.',
      color: result.emailSent ? 'success' : 'warning'
    })
  } catch (error) {
    toast.add({
      title: 'Invitation failed',
      description: errorMessage(error),
      color: 'error'
    })
  } finally {
    isInviting.value = false
  }
}

async function changeRole(user: ManagedUser, value: unknown) {
  if (value !== 'viewer' && value !== 'editor' && value !== 'admin') return

  const previousRole = roleDrafts[user._id] || user.role
  roleDrafts[user._id] = value
  busyUsers.add(user._id)

  try {
    await updateRole({ userId: user._id, role: value })
    toast.add({
      title: 'Role updated',
      description: `${user.email} is now ${value}.`,
      color: 'success'
    })
  } catch (error) {
    roleDrafts[user._id] = previousRole
    toast.add({
      title: 'Role was not updated',
      description: errorMessage(error),
      color: 'error'
    })
  } finally {
    busyUsers.delete(user._id)
  }
}

async function resendInvitation(userId: Id<'users'>) {
  busyUsers.add(userId)

  try {
    await convex.action(api.adminUsers.resendInvitation, { userId })
    toast.add({
      title: 'Invitation resent',
      description: 'Clerk accepted the new invitation for delivery.',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: 'Invitation was not resent',
      description: errorMessage(error),
      color: 'error'
    })
  } finally {
    busyUsers.delete(userId)
  }
}

async function revokeInvitation(userId: Id<'users'>) {
  if (!confirm('Revoke this pending user access?')) return
  busyUsers.add(userId)

  try {
    const result = await convex.action(api.adminUsers.revokePending, { userId })
    toast.add({
      title: 'Pending access revoked',
      description: result.invitationRevoked
        ? 'The Convex access record and Clerk invitation were revoked.'
        : 'The Convex access record was revoked. Any old Clerk link will no longer grant application access.',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: 'Access was not revoked',
      description: errorMessage(error),
      color: 'error'
    })
  } finally {
    busyUsers.delete(userId)
  }
}

async function setDisabled(userId: Id<'users'>, disabled: boolean) {
  if (disabled && !confirm('Disable this user’s application access?')) return
  busyUsers.add(userId)

  try {
    await updateDisabled({ userId, disabled })
    toast.add({
      title: disabled ? 'User disabled' : 'User restored',
      description: disabled
        ? 'Their Clerk session may remain signed in, but protected application access is blocked.'
        : 'Their existing account can access the application again.',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: disabled ? 'User was not disabled' : 'User was not restored',
      description: errorMessage(error),
      color: 'error'
    })
  } finally {
    busyUsers.delete(userId)
  }
}

definePageMeta({
  layout: 'admin',
  ssr: false
})
</script>
