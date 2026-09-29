import { expect, test } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.E2E_SUPABASE_URL;
const publishableKey = process.env.E2E_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
const authenticatedEnvironmentReady = Boolean(supabaseUrl && publishableKey && serviceRoleKey);

test.skip(!authenticatedEnvironmentReady, 'Requires isolated Supabase E2E credentials.');

test('an authenticated athlete completes a session and confirms a detected record', async ({ page }) => {
  test.setTimeout(90_000);
  const admin = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `haltero-e2e-${crypto.randomUUID()}@example.test`;
  const password = `E2e-${crypto.randomUUID()}-A1!`;
  let userId: string | null = null;

  try {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'Atleta E2E' },
    });
    if (created.error || !created.data.user) throw created.error ?? new Error('E2E user was not created.');
    userId = created.data.user.id;
    await seedSingleSetWorkout(admin, userId);

    await page.goto('/');
    await page.getByRole('textbox', { name: /Correo electrónico|Email/ }).fill(email);
    await page.getByLabel(/Contraseña|Password/).fill(password);
    await page.getByRole('button', { name: /Entrar|Sign in/, exact: true }).click();

    await expect(page.getByRole('button', { name: /Iniciar sesión|Start session/ })).toBeVisible();
    await page.getByRole('button', { name: /Iniciar sesión|Start session/ }).click();
    await page.getByLabel(/Carga de la serie 1 en kilogramos|Load for set 1 in kilograms/).fill('60');
    await page.getByLabel(/Repeticiones de la serie 1|Repetitions for set 1/).fill('1');
    const completedSetButton = page.getByRole('button', { name: /Marcar serie 1 como completada|Mark set 1 as completed/ });
    await completedSetButton.click();
    await expect(completedSetButton).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.session-footer')).toContainText(/0 pendientes|0 pending/);
    await page.getByRole('button', { name: /Finalizar sesión|Finish session/ })
      .evaluate((button) => (button as HTMLButtonElement).click());
    await expect(page.getByRole('heading', { name: /¿Cómo ha ido la sesión\?|How did the session feel\?/ })).toBeVisible();
    await page.getByRole('button', { name: /Guardar y finalizar|Save and finish/ }).click();

    await expect(page.getByRole('heading', { name: /Has superado una de tus marcas|You beat one of your personal bests/ })).toBeVisible();
    await page.getByRole('button', { name: /Guardar|Save/, exact: true }).click();
    await expect(page.getByText(/Marca guardada|Record saved/)).toBeVisible();

    await expect.poll(async () => {
      const { data } = await admin.from('exercise_records')
        .select('weight_kg,status,repetitions')
        .eq('user_id', userId!)
        .eq('status', 'confirmed')
        .maybeSingle();
      return data ? `${data.weight_kg}:${data.repetitions}:${data.status}` : null;
    }).toBe('60:1:confirmed');

    await expect.poll(async () => {
      const { data } = await admin.from('lift_records')
        .select('lift,weight_kg,source')
        .eq('user_id', userId!)
        .eq('lift', 'back_squat')
        .maybeSingle();
      return data ? `${data.weight_kg}:${data.source}` : null;
    }).toBe('60:workout');

    await page.getByRole('button', { name: /Perfil|Profile/, exact: true }).first().click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Exportar datos|Export data/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^haltero-datos-\d{4}-\d{2}-\d{2}\.json$/);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const exported = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
    expect(exported).toMatchObject({ schemaVersion: 1 });
    expect(Array.isArray(exported.workoutSessions)).toBe(true);
    const exportedAccount = exported.account as Record<string, unknown>;
    expect(exportedAccount).not.toHaveProperty('encrypted_password');
    expect(exportedAccount).not.toHaveProperty('recovery_token');
    expect(exportedAccount).not.toHaveProperty('raw_app_meta_data');

    await page.getByRole('button', { name: /Rutinas|Routines/, exact: true }).first().click();
    await page.getByRole('tab', { name: /Comunidad|Community/ }).click();
    const communityCards = page.locator('.community-routine-card');
    await expect(communityCards.first()).toBeVisible();
    const firstPageCount = await communityCards.count();
    expect(firstPageCount).toBeLessThanOrEqual(8);
    const loadMore = page.getByRole('button', { name: /Cargar más rutinas|Load more routines/ });
    if (await loadMore.isVisible()) {
      await loadMore.click();
      await expect.poll(() => communityCards.count()).toBeGreaterThan(firstPageCount);
    }
  } finally {
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});

test('an authenticated athlete can permanently delete the account', async ({ page }) => {
  test.setTimeout(60_000);
  const admin = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `haltero-delete-${crypto.randomUUID()}@example.test`;
  const password = `E2e-${crypto.randomUUID()}-A1!`;
  let userId: string | null = null;

  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: 'Borrado E2E' } });
    if (created.error || !created.data.user) throw created.error ?? new Error('E2E user was not created.');
    userId = created.data.user.id;
    await seedSingleSetWorkout(admin, userId);

    await page.goto('/');
    await page.getByRole('textbox', { name: /Correo electrónico|Email/ }).fill(email);
    await page.getByLabel(/Contraseña|Password/).fill(password);
    await page.getByRole('button', { name: /Entrar|Sign in/, exact: true }).click();
    await expect(page.getByRole('button', { name: /Perfil|Profile/, exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: /Perfil|Profile/, exact: true }).first().click();
    await page.getByRole('button', { name: /Eliminar cuenta|Delete account/ }).click();
    await page.getByLabel(/Escribe tu correo para confirmar|Enter your email to confirm/).fill(email);
    await page.getByRole('button', { name: /Eliminar definitivamente|Delete permanently/ }).click();

    await expect(page.getByRole('heading', { name: /Entrar en Haltero|Sign in to Haltero/ })).toBeVisible();
    await expect.poll(async () => {
      const { data } = await admin.auth.admin.getUserById(userId!);
      return data.user?.id ?? null;
    }).toBeNull();
    userId = null;
  } finally {
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});

async function seedSingleSetWorkout(admin: SupabaseClient, userId: string) {
  const { error: profileError } = await admin.from('profiles').update({
    onboarding_completed: true,
    training_days_per_week: 1,
    height_cm: 175,
    weight_kg: 80,
    weightlifting_experience: 'under_6_months',
    goals: ['strength'],
    level: 'beginner',
    preferred_language: 'es',
    confirm_detected_records: true,
  }).eq('user_id', userId);
  if (profileError) throw profileError;

  const { data: assignment, error: assignmentError } = await admin.from('routine_assignments')
    .select('id,routine_version_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  if (assignmentError) throw assignmentError;

  const { data: oldDays, error: oldDaysError } = await admin.from('routine_days')
    .select('id')
    .eq('routine_version_id', assignment.routine_version_id);
  if (oldDaysError) throw oldDaysError;
  const oldDayIds = oldDays.map((day) => day.id);
  if (oldDayIds.length) {
    const { error: prescriptionDeleteError } = await admin.from('prescriptions').delete().in('routine_day_id', oldDayIds);
    if (prescriptionDeleteError) throw prescriptionDeleteError;
  }
  const { error: dayDeleteError } = await admin.from('routine_days').delete().eq('routine_version_id', assignment.routine_version_id);
  if (dayDeleteError) throw dayDeleteError;

  const { error: versionError } = await admin.from('routine_versions').update({
    title: 'Rutina E2E',
    description: 'Sesión aislada para validar detección de marcas.',
    weeks: 1,
    days_per_week: 1,
    level: 'beginner',
    objective: 'strength',
  }).eq('id', assignment.routine_version_id);
  if (versionError) throw versionError;

  const { data: day, error: dayError } = await admin.from('routine_days').insert({
    routine_version_id: assignment.routine_version_id,
    week_number: 1,
    day_index: 1,
    name: 'Marca de sentadilla',
    phase: 'accumulation',
    percentage_adjustment: 0,
  }).select('id').single();
  if (dayError) throw dayError;

  const { error: prescriptionError } = await admin.from('prescriptions').insert({
    routine_day_id: day.id,
    exercise_id: '00000000-0000-4000-8000-000000000005',
    sort_order: 1,
    sets: 1,
    repetitions: 1,
    intensity_type: 'load',
    intensity_value: 50,
    suggested_load_kg: 50,
    rest_seconds: 60,
    notes: 'E2E',
  });
  if (prescriptionError) throw prescriptionError;
}
