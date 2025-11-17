import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Завантажуємо змінні середовища з .env
const envPath = path.join(__dirname, '..', '.env');
let supabaseUrl = '';
let supabaseAnonKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');

  for (const line of envLines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      const value = valueParts.join('=').trim();

      if (key.trim() === 'VITE_SUPABASE_URL') {
        supabaseUrl = value;
      } else if (key.trim() === 'VITE_SUPABASE_ANON_KEY') {
        supabaseAnonKey = value;
      }
    }
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Помилка: Відсутні змінні середовища');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listAllWorkers() {
  console.log('🔍 Завантаження всіх працівників...\n');

  try {
    // Спочатку перевіряємо поточного користувача
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('❌ Не вдалося отримати поточного користувача');
      console.error('   Можливо, потрібна авторизація через браузер');
      console.log('\n💡 Рекомендація: Запустіть додаток у браузері, увійдіть, і спробуйте знову');
      process.exit(1);
    }

    console.log(`✅ Поточний користувач: ${user.email}`);
    console.log(`   User ID: ${user.id}\n`);

    // Отримуємо всіх працівників для цього користувача
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (workersError) {
      throw workersError;
    }

    if (!workers || workers.length === 0) {
      console.log('📋 Працівників не знайдено');
      return;
    }

    console.log(`📋 Знайдено ${workers.length} працівників:\n`);

    // Отримуємо інформацію про прив'язки для кожного працівника
    for (let i = 0; i < workers.length; i++) {
      const worker = workers[i];

      const { data: assignments, error: assignmentsError } = await supabase
        .from('work_day_assignments')
        .select('id')
        .eq('worker_id', worker.id);

      const assignmentsCount = assignments?.length || 0;

      console.log(`${i + 1}. ID: ${worker.id}`);
      console.log(`   Ім'я: ${worker.name}`);
      console.log(`   Колір: ${worker.color}`);
      console.log(`   Primary: ${worker.is_primary ? 'Так' : 'Ні'}`);
      console.log(`   Прив'язок робочих днів: ${assignmentsCount}`);
      console.log(`   Створено: ${new Date(worker.created_at).toLocaleString('uk-UA')}`);
      console.log('');
    }

    // Шукаємо дублікати за іменем
    const nameCount = new Map();
    workers.forEach(worker => {
      const count = nameCount.get(worker.name) || 0;
      nameCount.set(worker.name, count + 1);
    });

    const duplicates = Array.from(nameCount.entries()).filter(([_, count]) => count > 1);

    if (duplicates.length > 0) {
      console.log('⚠️  Знайдено дублікати:');
      duplicates.forEach(([name, count]) => {
        console.log(`   - "${name}": ${count} записів`);
      });
    } else {
      console.log('✅ Дублікатів не знайдено');
    }

  } catch (error) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  }
}

// Запускаємо скрипт
listAllWorkers();
