/**
 * Capa de acceso a SQLite usando el módulo incorporado `node:sqlite` de Node 24.
 *
 * La base es la fuente de verdad de identidades, productos, órdenes, códigos y
 * derechos de acceso. En producción se recomienda una instancia única con
 * respaldo del archivo; las pruebas usan una ruta temporal aislada.
 */

import fs from 'node:fs';
import path from 'node:path';

export type SqlValue = string | number | null;

export interface SqliteRunResult {
  changes: number;
  lastInsertRowid: number;
}

export interface SqliteStatement {
  all(...params: SqlValue[]): any[];
  get(...params: SqlValue[]): any;
  run(...params: SqlValue[]): SqliteRunResult;
}

export interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

interface DatabaseSyncConstructor {
  new (location: string): SqliteDatabase;
}

interface NodeSqliteModule {
  DatabaseSync: DatabaseSyncConstructor;
}

interface Migration {
  version: number;
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'modelo_central_identidad_productos_y_accesos',
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL COLLATE NOCASE UNIQUE,
        email_verified INTEGER NOT NULL DEFAULT 0,
        display_name TEXT,
        username TEXT COLLATE NOCASE UNIQUE,
        password_hash TEXT,
        password_updated_at TEXT,
        must_change_password INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','invited')),
        is_minor INTEGER NOT NULL DEFAULT 0,
        avatar_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS identities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        subject TEXT NOT NULL,
        email TEXT NOT NULL COLLATE NOCASE,
        email_verified INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        last_login_at TEXT,
        UNIQUE (provider, subject)
      );
      CREATE INDEX IF NOT EXISTS ix_identities_user ON identities(user_id);

      CREATE TABLE IF NOT EXISTS roles (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        rank INTEGER NOT NULL DEFAULT 100,
        is_system INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS permissions (
        code TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        category TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        role_code TEXT NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
        permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
        PRIMARY KEY (role_code, permission_code)
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_code TEXT NOT NULL REFERENCES roles(code),
        granted_by TEXT,
        granted_at TEXT NOT NULL,
        revoked_by TEXT,
        revoked_at TEXT
      );
      CREATE INDEX IF NOT EXISTS ix_user_roles_user ON user_roles(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_user_roles_active
        ON user_roles(user_id, role_code) WHERE revoked_at IS NULL;

      CREATE TABLE IF NOT EXISTS user_permissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission_code TEXT NOT NULL REFERENCES permissions(code),
        granted_by TEXT,
        granted_at TEXT NOT NULL,
        expires_at TEXT,
        revoked_by TEXT,
        revoked_at TEXT
      );
      CREATE INDEX IF NOT EXISTS ix_user_permissions_user ON user_permissions(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_user_permissions_active
        ON user_permissions(user_id, permission_code) WHERE revoked_at IS NULL;

      CREATE TABLE IF NOT EXISTS sessions (
        id_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        csrf_token TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        revoked_at TEXT,
        ip_hash TEXT,
        ua_hash TEXT
      );
      CREATE INDEX IF NOT EXISTS ix_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS ix_sessions_expiry ON sessions(expires_at);

      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('course','workshop','grade','homeschool_program','material','collection')),
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_resources_type ON resources(type);

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
        price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
        currency TEXT NOT NULL DEFAULT 'USD',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_products_status ON products(status);

      CREATE TABLE IF NOT EXISTS product_resources (
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, resource_id)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','paid','failed','cancelled','refunded','reversed','free')),
        subtotal_cents INTEGER NOT NULL,
        discount_cents INTEGER NOT NULL DEFAULT 0,
        total_cents INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        discount_id TEXT,
        discount_code_id TEXT,
        paypal_order_id TEXT,
        paypal_capture_id TEXT,
        paypal_approval_url TEXT,
        idempotency_key TEXT,
        notes TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        paid_at TEXT
      );
      CREATE INDEX IF NOT EXISTS ix_orders_user ON orders(user_id);
      CREATE INDEX IF NOT EXISTS ix_orders_status ON orders(status);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_paypal ON orders(paypal_order_id)
        WHERE paypal_order_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_idempotency ON orders(user_id, idempotency_key)
        WHERE idempotency_key IS NOT NULL;

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id),
        title_snapshot TEXT NOT NULL,
        unit_price_cents INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS ix_order_items_order ON order_items(order_id);

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id),
        provider TEXT NOT NULL CHECK (provider IN ('paypal','free')),
        kind TEXT NOT NULL CHECK (kind IN ('capture','refund','reversal','free')),
        provider_txn_id TEXT,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_transactions_order ON transactions(order_id);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_provider_txn
        ON transactions(provider, provider_txn_id) WHERE provider_txn_id IS NOT NULL;

      CREATE TABLE IF NOT EXISTS webhook_events (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        event_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        resource_id TEXT,
        status TEXT NOT NULL DEFAULT 'received',
        created_at TEXT NOT NULL,
        processed_at TEXT,
        UNIQUE (provider, event_id)
      );

      CREATE TABLE IF NOT EXISTS enrollments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        product_id TEXT REFERENCES products(id),
        resource_id TEXT REFERENCES resources(id),
        student_profile_id TEXT,
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('pending','active','paused','revoked','completed')),
        origin TEXT NOT NULL,
        order_id TEXT REFERENCES orders(id),
        gift_redemption_id TEXT,
        starts_at TEXT NOT NULL,
        ends_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_enrollments_user ON enrollments(user_id);

      CREATE TABLE IF NOT EXISTS entitlements (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        resource_id TEXT NOT NULL REFERENCES resources(id),
        origin TEXT NOT NULL CHECK (origin IN (
          'purchase','gift','promo_full','scholarship','founder_invitation',
          'investor_invitation','manual_owner','enrollment','bundle','migration'
        )),
        origin_ref TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('pending','active','paused','revoked','expired')),
        starts_at TEXT NOT NULL,
        ends_at TEXT,
        granted_by TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        revoked_at TEXT,
        revoked_by TEXT,
        revoke_reason TEXT
      );
      CREATE INDEX IF NOT EXISTS ix_entitlements_user ON entitlements(user_id);
      CREATE INDEX IF NOT EXISTS ix_entitlements_resource ON entitlements(resource_id);
      CREATE INDEX IF NOT EXISTS ix_entitlements_end ON entitlements(ends_at);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_entitlements_grant
        ON entitlements(user_id, resource_id, origin, origin_ref) WHERE status <> 'revoked';

      CREATE TABLE IF NOT EXISTS global_access_grants (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        kind TEXT NOT NULL CHECK (kind IN ('founder','investor','owner','manual')),
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('pending','active','paused','revoked','expired')),
        starts_at TEXT NOT NULL,
        ends_at TEXT,
        origin TEXT NOT NULL,
        origin_ref TEXT NOT NULL DEFAULT '',
        granted_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        revoked_at TEXT,
        revoke_reason TEXT
      );
      CREATE INDEX IF NOT EXISTS ix_global_access_user ON global_access_grants(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_global_access_grant
        ON global_access_grants(user_id, kind, origin, origin_ref) WHERE status <> 'revoked';

      CREATE TABLE IF NOT EXISTS discounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('percentage','fixed','full')),
        value INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','expired')),
        applies_all INTEGER NOT NULL DEFAULT 0,
        starts_at TEXT NOT NULL,
        ends_at TEXT,
        max_uses INTEGER,
        max_uses_per_user INTEGER,
        min_purchase_cents INTEGER NOT NULL DEFAULT 0,
        stackable INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS discount_codes (
        id TEXT PRIMARY KEY,
        discount_id TEXT NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
        code_hash TEXT NOT NULL UNIQUE,
        code_hint TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','revoked')),
        created_by TEXT,
        created_at TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE INDEX IF NOT EXISTS ix_discount_codes_discount ON discount_codes(discount_id);

      CREATE TABLE IF NOT EXISTS discount_resources (
        discount_id TEXT NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
        resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
        PRIMARY KEY (discount_id, resource_id)
      );

      CREATE TABLE IF NOT EXISTS discount_redemptions (
        id TEXT PRIMARY KEY,
        discount_code_id TEXT NOT NULL REFERENCES discount_codes(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        order_id TEXT NOT NULL REFERENCES orders(id),
        amount_cents INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','consumed','released')),
        created_at TEXT NOT NULL,
        consumed_at TEXT,
        UNIQUE (order_id)
      );
      CREATE INDEX IF NOT EXISTS ix_discount_redemptions_code ON discount_redemptions(discount_code_id);
      CREATE INDEX IF NOT EXISTS ix_discount_redemptions_user ON discount_redemptions(user_id);

      CREATE TABLE IF NOT EXISTS gift_codes (
        id TEXT PRIMARY KEY,
        code_hash TEXT NOT NULL UNIQUE,
        code_hint TEXT NOT NULL,
        label TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','revoked','exhausted')),
        max_redemptions INTEGER NOT NULL DEFAULT 1,
        redemption_count INTEGER NOT NULL DEFAULT 0,
        redeem_by TEXT,
        access_starts_at TEXT,
        duration_days INTEGER,
        duration_months INTEGER,
        ends_at TEXT,
        unlimited INTEGER NOT NULL DEFAULT 0,
        recipient_email TEXT COLLATE NOCASE,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        revoked_at TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS gift_code_resources (
        gift_code_id TEXT NOT NULL REFERENCES gift_codes(id) ON DELETE CASCADE,
        resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
        PRIMARY KEY (gift_code_id, resource_id)
      );

      CREATE TABLE IF NOT EXISTS gift_redemptions (
        id TEXT PRIMARY KEY,
        gift_code_id TEXT NOT NULL REFERENCES gift_codes(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        redeemed_at TEXT NOT NULL,
        access_starts_at TEXT NOT NULL,
        access_ends_at TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','revoked')),
        UNIQUE (gift_code_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS ix_gift_redemptions_user ON gift_redemptions(user_id);

      CREATE TABLE IF NOT EXISTS invitations (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('founder','investor')),
        mode TEXT NOT NULL CHECK (mode IN ('nominated','open')),
        email TEXT COLLATE NOCASE,
        token_hash TEXT NOT NULL UNIQUE,
        token_hint TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','revoked','exhausted')),
        max_uses INTEGER NOT NULL DEFAULT 1,
        use_count INTEGER NOT NULL DEFAULT 0,
        starts_at TEXT NOT NULL,
        expires_at TEXT,
        access_starts_at TEXT,
        access_days INTEGER,
        access_months INTEGER,
        access_ends_at TEXT,
        unlimited INTEGER NOT NULL DEFAULT 1,
        label TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        revoked_at TEXT
      );

      CREATE TABLE IF NOT EXISTS invitation_redemptions (
        id TEXT PRIMARY KEY,
        invitation_id TEXT NOT NULL REFERENCES invitations(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        redeemed_at TEXT NOT NULL,
        grant_id TEXT,
        UNIQUE (invitation_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS student_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        age INTEGER,
        grade TEXT,
        subnivel TEXT,
        folder_code TEXT,
        profile_agent TEXT,
        language TEXT NOT NULL DEFAULT 'ES',
        portfolio_owner TEXT,
        mentor_email TEXT,
        moodle_user_id INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS guardian_students (
        id TEXT PRIMARY KEY,
        guardian_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_profile_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
        relationship TEXT NOT NULL DEFAULT 'tutor',
        verified_at TEXT,
        created_at TEXT NOT NULL,
        UNIQUE (guardian_user_id, student_profile_id)
      );

      CREATE TABLE IF NOT EXISTS grade_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        resource_id TEXT REFERENCES resources(id),
        legacy_course_id INTEGER,
        trimester INTEGER NOT NULL CHECK (trimester IN (1,2,3)),
        grade REAL NOT NULL CHECK (grade >= 0 AND grade <= 10),
        updated_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (user_id, resource_id, trimester)
      );

      CREATE TABLE IF NOT EXISTS crm_contacts (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL COLLATE NOCASE UNIQUE,
        name TEXT,
        phone TEXT,
        status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead','customer','guardian','inactive')),
        consent_email INTEGER NOT NULL DEFAULT 0,
        consent_updated_at TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        actor_user_id TEXT,
        actor_role TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        before_json TEXT,
        after_json TEXT,
        ip_hash TEXT,
        ua_hash TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_audit_created ON audit_log(created_at);
      CREATE INDEX IF NOT EXISTS ix_audit_entity ON audit_log(entity_type, entity_id);

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT
      );

      CREATE TABLE IF NOT EXISTS rate_limits (
        bucket TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (bucket, key_hash, window_start)
      );
    `,
  },
  {
    version: 2,
    name: 'calendario_y_plan_academico_anual',
    sql: `
      CREATE TABLE IF NOT EXISTS academic_years (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        total_school_days INTEGER NOT NULL DEFAULT 200,
        regime TEXT NOT NULL DEFAULT 'SIERRA_AMAZONIA',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS academic_calendar_events (
        id TEXT PRIMARY KEY,
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        event_date TEXT NOT NULL,
        title TEXT NOT NULL,
        kind TEXT NOT NULL,
        description TEXT,
        UNIQUE (academic_year_id, event_date, title)
      );
      CREATE INDEX IF NOT EXISTS ix_academic_events_year_date
        ON academic_calendar_events(academic_year_id, event_date);

      CREATE TABLE IF NOT EXISTS academic_plans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        day_number INTEGER NOT NULL,
        plan_date TEXT NOT NULL,
        week_number INTEGER NOT NULL,
        trimester INTEGER NOT NULL CHECK (trimester IN (1,2,3)),
        title TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'published',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (user_id, plan_date)
      );
      CREATE INDEX IF NOT EXISTS ix_academic_plans_user_date
        ON academic_plans(user_id, plan_date);
      CREATE INDEX IF NOT EXISTS ix_academic_plans_year
        ON academic_plans(academic_year_id);

      CREATE TABLE IF NOT EXISTS academic_plan_subjects (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL REFERENCES academic_plans(id) ON DELETE CASCADE,
        subject TEXT NOT NULL,
        topic TEXT NOT NULL,
        objective TEXT,
        resource_kind TEXT NOT NULL DEFAULT 'guia_diaria',
        resource_path TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_academic_subjects_plan
        ON academic_plan_subjects(plan_id);
    `,
  },
  {
    version: 3,
    name: 'cursos_talleres_drive_repasos_y_evaluaciones',
    sql: `
      CREATE TABLE IF NOT EXISTS course_programs (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL UNIQUE REFERENCES resources(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('course','workshop')),
        title TEXT NOT NULL,
        subtitle TEXT,
        description TEXT,
        institution TEXT,
        level TEXT,
        audience TEXT,
        duration_label TEXT,
        objectives_json TEXT NOT NULL DEFAULT '[]',
        requirements_json TEXT NOT NULL DEFAULT '[]',
        cover_image_url TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
        drive_folder_id TEXT,
        drive_folder_url TEXT,
        drive_synced_at TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_course_programs_status ON course_programs(status, kind);

      CREATE TABLE IF NOT EXISTS course_modules (
        id TEXT PRIMARY KEY,
        program_id TEXT NOT NULL REFERENCES course_programs(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'module' CHECK (kind IN ('semester','module','unit')),
        position INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        drive_folder_id TEXT,
        drive_folder_url TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_course_modules_program
        ON course_modules(program_id, position);

      CREATE TABLE IF NOT EXISTS course_lessons (
        id TEXT PRIMARY KEY,
        program_id TEXT NOT NULL REFERENCES course_programs(id) ON DELETE CASCADE,
        module_id TEXT NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        youtube_video_ids_json TEXT NOT NULL DEFAULT '[]',
        pages_label TEXT,
        duration_label TEXT,
        drive_folder_id TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_course_lessons_module
        ON course_lessons(module_id, position);
      CREATE INDEX IF NOT EXISTS ix_course_lessons_program
        ON course_lessons(program_id);

      CREATE TABLE IF NOT EXISTS course_materials (
        id TEXT PRIMARY KEY,
        program_id TEXT NOT NULL REFERENCES course_programs(id) ON DELETE CASCADE,
        module_id TEXT REFERENCES course_modules(id) ON DELETE CASCADE,
        lesson_id TEXT REFERENCES course_lessons(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('drive_file','drive_folder','external_link','text','full_text')),
        title TEXT NOT NULL,
        url TEXT,
        drive_file_id TEXT,
        visibility TEXT NOT NULL DEFAULT 'student' CHECK (visibility IN ('student','staff')),
        position INTEGER NOT NULL DEFAULT 0,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_course_materials_program
        ON course_materials(program_id, position);
      CREATE INDEX IF NOT EXISTS ix_course_materials_lesson
        ON course_materials(lesson_id, position);

      CREATE TABLE IF NOT EXISTS lesson_progress (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id TEXT NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
        program_id TEXT NOT NULL REFERENCES course_programs(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'in_progress'
          CHECK (status IN ('in_progress','completed')),
        playback_seconds INTEGER NOT NULL DEFAULT 0 CHECK (playback_seconds >= 0),
        completed_at TEXT,
        updated_at TEXT NOT NULL,
        UNIQUE (user_id, lesson_id)
      );
      CREATE INDEX IF NOT EXISTS ix_lesson_progress_user_program
        ON lesson_progress(user_id, program_id);

      CREATE TABLE IF NOT EXISTS weekly_reviews (
        id TEXT PRIMARY KEY,
        program_id TEXT NOT NULL REFERENCES course_programs(id) ON DELETE CASCADE,
        module_id TEXT REFERENCES course_modules(id) ON DELETE SET NULL,
        week_label TEXT NOT NULL,
        title TEXT NOT NULL,
        content_md TEXT NOT NULL,
        source_refs_json TEXT NOT NULL DEFAULT '[]',
        is_ai_generated INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
        position INTEGER NOT NULL DEFAULT 0,
        published_at TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_weekly_reviews_program
        ON weekly_reviews(program_id, position);

      CREATE TABLE IF NOT EXISTS assessments (
        id TEXT PRIMARY KEY,
        program_id TEXT NOT NULL REFERENCES course_programs(id) ON DELETE CASCADE,
        module_id TEXT REFERENCES course_modules(id) ON DELETE SET NULL,
        kind TEXT NOT NULL CHECK (kind IN ('midterm','final','practice')),
        origin TEXT NOT NULL DEFAULT 'generated' CHECK (origin IN ('official','generated')),
        title TEXT NOT NULL,
        instructions TEXT,
        status TEXT NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft','review','published','archived')),
        attempts_allowed INTEGER NOT NULL DEFAULT 1 CHECK (attempts_allowed >= 1 AND attempts_allowed <= 10),
        time_limit_minutes INTEGER CHECK (time_limit_minutes IS NULL OR time_limit_minutes BETWEEN 1 AND 600),
        pass_percentage REAL CHECK (pass_percentage IS NULL OR (pass_percentage >= 0 AND pass_percentage <= 100)),
        opens_at TEXT,
        closes_at TEXT,
        grading_mode TEXT NOT NULL DEFAULT 'equal_weight',
        source_refs_json TEXT NOT NULL DEFAULT '[]',
        audit_json TEXT NOT NULL DEFAULT '{}',
        version INTEGER NOT NULL DEFAULT 1,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_assessments_program
        ON assessments(program_id, kind);

      CREATE TABLE IF NOT EXISTS assessment_questions (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('true_false','multiple_choice')),
        prompt TEXT NOT NULL,
        options_json TEXT NOT NULL DEFAULT '[]',
        correct_key TEXT NOT NULL,
        source_ref TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        review_state TEXT NOT NULL DEFAULT 'approved'
          CHECK (review_state IN ('approved','needs_review')),
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_assessment_questions_assessment
        ON assessment_questions(assessment_id, position);

      CREATE TABLE IF NOT EXISTS assessment_attempts (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        attempt_number INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'in_progress'
          CHECK (status IN ('in_progress','submitted','graded','void')),
        started_at TEXT NOT NULL,
        submitted_at TEXT,
        graded_at TEXT,
        correct_count INTEGER,
        total_questions INTEGER,
        percentage REAL,
        idempotency_key TEXT,
        UNIQUE (assessment_id, user_id, attempt_number),
        UNIQUE (assessment_id, user_id, idempotency_key)
      );
      CREATE INDEX IF NOT EXISTS ix_assessment_attempts_user
        ON assessment_attempts(user_id, assessment_id);

      CREATE TABLE IF NOT EXISTS assessment_answers (
        id TEXT PRIMARY KEY,
        attempt_id TEXT NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL REFERENCES assessment_questions(id),
        selected_key TEXT,
        is_correct INTEGER NOT NULL DEFAULT 0,
        UNIQUE (attempt_id, question_id)
      );

      CREATE TABLE IF NOT EXISTS course_grade_reports (
        id TEXT PRIMARY KEY,
        attempt_id TEXT NOT NULL UNIQUE REFERENCES assessment_attempts(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        program_id TEXT NOT NULL REFERENCES course_programs(id) ON DELETE CASCADE,
        assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        generated_at TEXT NOT NULL,
        drive_file_id TEXT,
        drive_url TEXT,
        drive_status TEXT NOT NULL DEFAULT 'pending'
          CHECK (drive_status IN ('pending','synced','failed','skipped')),
        drive_error TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_course_grade_reports_user
        ON course_grade_reports(user_id, program_id);

      CREATE TABLE IF NOT EXISTS course_import_runs (
        id TEXT PRIMARY KEY,
        program_id TEXT REFERENCES course_programs(id) ON DELETE SET NULL,
        kind TEXT NOT NULL,
        filename TEXT NOT NULL,
        summary_json TEXT NOT NULL DEFAULT '{}',
        created_by TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS drive_folders (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        purpose TEXT NOT NULL,
        web_view_link TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_drive_folders_parent ON drive_folders(parent_id);
    `,
  },
  {
    version: 4,
    name: 'version_de_examen_en_intentos_e_informes',
    sql: `
      ALTER TABLE assessment_attempts
        ADD COLUMN assessment_version INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE course_grade_reports
        ADD COLUMN assessment_version INTEGER NOT NULL DEFAULT 1;
    `,
  },
  {
    version: 5,
    name: 'producto_de_catalogo_para_cursos_y_talleres',
    sql: `
      ALTER TABLE course_programs
        ADD COLUMN catalog_product_id TEXT;
    `,
  },
  {
    version: 6,
    name: 'repasos_semanales_en_vivo',
    sql: `
      CREATE TABLE IF NOT EXISTS weekly_meetings (
        id TEXT PRIMARY KEY,
        program_id TEXT NOT NULL REFERENCES course_programs(id) ON DELETE CASCADE,
        module_id TEXT REFERENCES course_modules(id) ON DELETE SET NULL,
        week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 99),
        title TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'google_meet'
          CHECK (provider IN ('google_meet','jitsi','daily','bigbluebutton','zoom','teams','custom')),
        embed_mode TEXT NOT NULL DEFAULT 'external'
          CHECK (embed_mode IN ('iframe','external','sdk')),
        join_url TEXT NOT NULL,
        host_url TEXT,
        host_name TEXT,
        starts_at TEXT,
        ends_at TEXT,
        timezone TEXT NOT NULL DEFAULT 'America/Guayaquil',
        status TEXT NOT NULL DEFAULT 'published'
          CHECK (status IN ('draft','published','live','completed','cancelled')),
        student_note TEXT,
        staff_note TEXT,
        recording_url TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (program_id, week_number)
      );
      CREATE INDEX IF NOT EXISTS ix_weekly_meetings_program
        ON weekly_meetings(program_id, week_number);

      INSERT OR IGNORE INTO permissions (code, description, category)
      VALUES ('meetings.manage', 'Gestionar salas de repaso semanal y enlaces de videollamada', 'academico');
    `,
  },
  {
    version: 7,
    name: 'indice_de_sesiones_revocadas',
    sql: `
      CREATE INDEX IF NOT EXISTS ix_sessions_revoked ON sessions(revoked_at);
    `,
  },
  {
    version: 8,
    name: 'estado_de_precio_explicito_en_productos',
    sql: `
      ALTER TABLE products
        ADD COLUMN price_status TEXT NOT NULL DEFAULT 'defined'
        CHECK (price_status IN ('defined','pending'));

      UPDATE products
      SET price_status = 'pending'
      WHERE price_cents = 0 AND slug LIKE 'wa-programa-%';
    `,
  },
];

let database: SqliteDatabase | null = null;
let databasePath: string | null = null;
let databaseInitializer: ((db: SqliteDatabase) => void) | null = null;
const statementCache = new WeakMap<SqliteDatabase, Map<string, SqliteStatement>>();
const transactionState = new WeakMap<SqliteDatabase, { depth: number; savepoint: number }>();

function loadSqliteModule(): NodeSqliteModule {
  const getBuiltinModule = (
    process as unknown as { getBuiltinModule?: (id: string) => unknown }
  ).getBuiltinModule;

  const sqlite = getBuiltinModule?.('node:sqlite') as NodeSqliteModule | undefined;
  if (!sqlite?.DatabaseSync) {
    throw new Error(
      'Este entorno no expone node:sqlite. Wisdom Academy requiere Node 24 o superior.'
    );
  }
  return sqlite;
}

export function nowIso(): string {
  return new Date().toISOString();
}

function resolveDatabasePath(): string {
  const configured = process.env.WISDOM_DB_PATH?.trim();
  if (configured) return configured;
  return path.join(process.cwd(), '.data', 'wisdom.db');
}

/**
 * Vercel ejecuta funciones sin un sistema de archivos persistente: el archivo
 * SQLite se perdería en cada despliegue o instancia. Se bloquea el arranque en
 * producción para impedir una pérdida silenciosa de datos. La solución es
 * desplegar en un host con volumen persistente o migrar a una base administrada.
 */
function assertPersistentDatabaseLocation(location: string): void {
  const onVercelProduction =
    process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production';
  if (!onVercelProduction || process.env.WISDOM_ALLOW_EPHEMERAL_DB === '1') return;
  throw new Error(
    [
      'WISDOM_DB_PATH no es persistente en Vercel Production.',
      `Ruta configurada: ${location}.`,
      'Vercel no ofrece volúmenes persistentes para funciones serverless.',
      'Despliega la aplicación completa en un host con disco persistente (Render, Railway, Fly.io o VPS)',
      'o migra la capa de datos a una base administrada antes de usar Vercel.',
      'Consulta docs/despliegue/GUIA_PRODUCCION_VERCEL.md.',
    ].join(' ')
  );
}

function applyMigrations(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all();
  const applied = new Set(appliedRows.map((row) => Number(row.version)));

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(migration.sql);
      db.prepare(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
      ).run(migration.version, migration.name, nowIso());
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

/**
 * Registra la siembra idempotente que debe ejecutarse al abrir una conexión.
 * La conexión la invoca antes de cualquier transacción de la aplicación.
 */
export function setDatabaseInitializer(initializer: (db: SqliteDatabase) => void): void {
  databaseInitializer = initializer;
}

/** Abre una base en una ruta concreta sin ejecutar migraciones ni siembra. */
export function openRawDatabase(location: string): SqliteDatabase {
  const sqlite = loadSqliteModule();
  return new sqlite.DatabaseSync(location);
}

export function getDb(): SqliteDatabase {
  if (database) return database;

  const sqlite = loadSqliteModule();
  const location = resolveDatabasePath();
  assertPersistentDatabaseLocation(location);
  if (location !== ':memory:') {
    fs.mkdirSync(path.dirname(location), { recursive: true });
  }

  const db = new sqlite.DatabaseSync(location);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  if (location !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA synchronous = NORMAL');
  }
  applyMigrations(db);
  databaseInitializer?.(db);

  database = db;
  databasePath = location;
  return db;
}

export function prepare(sql: string): SqliteStatement {
  const db = getDb();
  let cache = statementCache.get(db);
  if (!cache) {
    cache = new Map();
    statementCache.set(db, cache);
  }
  const cached = cache.get(sql);
  if (cached) return cached;
  const statement = db.prepare(sql);
  cache.set(sql, statement);
  return statement;
}

/**
 * Ejecuta una operación en una transacción inmediata. Las llamadas anidadas
 * utilizan SAVEPOINT para conservar la atomicidad sin abortar la transacción
 * externa.
 */
export function withTransaction<T>(fn: () => T): T {
  const db = getDb();
  const state = transactionState.get(db) ?? { depth: 0, savepoint: 0 };
  transactionState.set(db, state);

  if (state.depth === 0) {
    db.exec('BEGIN IMMEDIATE');
    state.depth = 1;
    try {
      const result = fn();
      db.exec('COMMIT');
      state.depth = 0;
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      state.depth = 0;
      throw error;
    }
  }

  const savepoint = `sp_${state.savepoint + 1}`;
  state.savepoint += 1;
  state.depth += 1;
  db.exec(`SAVEPOINT ${savepoint}`);
  try {
    const result = fn();
    db.exec(`RELEASE ${savepoint}`);
    state.depth -= 1;
    return result;
  } catch (error) {
    db.exec(`ROLLBACK TO ${savepoint}`);
    db.exec(`RELEASE ${savepoint}`);
    state.depth -= 1;
    throw error;
  }
}

export function closeDb(): void {
  if (!database) return;
  database.close();
  database = null;
  databasePath = null;
}

/** Solo para pruebas: elimina la conexión y el archivo temporal indicado. */
export function resetDbForTests(): void {
  const location = databasePath;
  closeDb();
  if (location && location !== ':memory:') {
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.rmSync(`${location}${suffix}`, { force: true });
      } catch {
        // El archivo puede seguir bloqueado por otro proceso de prueba.
      }
    }
  }
}

export function getDatabasePath(): string | null {
  return databasePath;
}
