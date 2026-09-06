import { assertAdmin, fail, getAdminClient, methodGuard, requireUser } from './_lib/server.js'

/** Sends a branded invite email through Resend. Non-fatal if Resend is unset. */
async function sendResendInvite({ email, fullName, orgName, appUrl }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) return { sent: false, reason: 'Resend is not configured.' }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `${orgName} invited you to AceHR`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111827">
          <h1 style="font-size:20px;margin:0 0 12px">You have been added to ${orgName}</h1>
          <p style="font-size:14px;line-height:22px;color:#4B5563">
            Hi ${fullName || 'there'}, ${orgName} uses AceHR to manage time off, work hours and
            overtime. Check your inbox for the sign-in link from Supabase, then set your password.
          </p>
          <p style="margin:24px 0">
            <a href="${appUrl}/login"
               style="background:#4CAF87;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">
              Open AceHR
            </a>
          </p>
          <p style="font-size:12px;color:#9CA3AF">If you were not expecting this, you can ignore it.</p>
        </div>
      `,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    return { sent: false, reason: `Resend rejected the email: ${detail}` }
  }
  return { sent: true }
}

/**
 * Invites a teammate: issues the Supabase auth invite, creates their users row
 * in the caller's org, and provisions a matching employee record.
 */
export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return

  try {
    const { profile } = await requireUser(req)
    assertAdmin(profile)

    const { email, fullName, role = 'employee', branch = null } = req.body ?? {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const err = new Error('A valid email address is required.')
      err.status = 400
      throw err
    }
    if (!['admin', 'manager', 'employee'].includes(role)) {
      const err = new Error('Role must be admin, manager or employee.')
      err.status = 400
      throw err
    }

    const admin = getAdminClient()
    const appUrl = process.env.VITE_APP_URL || ''

    const { data: org } = await admin
      .from('organizations')
      .select('id, name')
      .eq('id', profile.org_id)
      .single()

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName || '', org_id: profile.org_id, role },
      redirectTo: `${appUrl}/login`,
    })
    if (inviteError) {
      const err = new Error(inviteError.message)
      err.status = inviteError.status === 422 ? 409 : 400
      throw err
    }

    const invitedId = invited?.user?.id
    if (invitedId) {
      const { error: userError } = await admin.from('users').upsert(
        {
          id: invitedId,
          org_id: profile.org_id,
          full_name: fullName || email,
          email,
          role,
        },
        { onConflict: 'id' }
      )
      if (userError) throw new Error(userError.message)

      const { data: existingEmployee } = await admin
        .from('employees')
        .select('id')
        .eq('org_id', profile.org_id)
        .eq('email', email)
        .maybeSingle()

      if (existingEmployee) {
        await admin.from('employees').update({ user_id: invitedId }).eq('id', existingEmployee.id)
      } else {
        await admin.from('employees').insert({
          org_id: profile.org_id,
          user_id: invitedId,
          full_name: fullName || email,
          email,
          branch,
          hire_date: new Date().toISOString().slice(0, 10),
        })
      }
    }

    const notification = await sendResendInvite({
      email,
      fullName,
      orgName: org?.name ?? 'Your agency',
      appUrl,
    })

    res.status(200).json({ invited: true, notification })
  } catch (error) {
    fail(res, error)
  }
}
