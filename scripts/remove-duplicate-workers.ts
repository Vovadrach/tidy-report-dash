import { createClient } from '@supabase/supabase-js';

// Використовуйте ваші облікові дані Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Помилка: Відсутні змінні середовища VITE_SUPABASE_URL та VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function removeDuplicateWorkers() {
  console.log('🔍 Пошук дублікатів працівника "Лідія"...\n');

  try {
    // Отримуємо всіх працівників з іменем "Лідія"
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('*')
      .ilike('name', 'Лідія')
      .order('created_at', { ascending: true });

    if (workersError) {
      throw workersError;
    }

    if (!workers || workers.length === 0) {
      console.log('✅ Працівників з іменем "Лідія" не знайдено');
      return;
    }

    console.log(`📋 Знайдено ${workers.length} працівників з іменем "Лідія":\n`);

    // Отримуємо інформацію про прив'язки для кожного працівника
    const workersWithAssignments = await Promise.all(
      workers.map(async (worker) => {
        const { data: assignments, error: assignmentsError } = await supabase
          .from('work_day_assignments')
          .select('id')
          .eq('worker_id', worker.id);

        if (assignmentsError) {
          console.error(`⚠️  Помилка отримання прив'язок для працівника ${worker.id}:`, assignmentsError);
          return { ...worker, assignmentsCount: 0 };
        }

        return {
          ...worker,
          assignmentsCount: assignments?.length || 0
        };
      })
    );

    // Виводимо інформацію про кожного працівника
    workersWithAssignments.forEach((worker, index) => {
      console.log(`${index + 1}. ID: ${worker.id}`);
      console.log(`   Ім'я: ${worker.name}`);
      console.log(`   Primary: ${worker.is_primary ? 'Так' : 'Ні'}`);
      console.log(`   Прив'язок: ${worker.assignmentsCount}`);
      console.log(`   Створено: ${new Date(worker.created_at).toLocaleString('uk-UA')}`);
      console.log('');
    });

    if (workersWithAssignments.length <= 1) {
      console.log('✅ Дублікатів не знайдено (є лише один працівник)');
      return;
    }

    // Визначаємо, який працівник залишити
    // Пріоритет: 1) is_primary, 2) найбільше прив'язок, 3) найстаріший
    const keepWorker = workersWithAssignments.reduce((best, current) => {
      if (current.is_primary && !best.is_primary) return current;
      if (!current.is_primary && best.is_primary) return best;

      if (current.assignmentsCount > best.assignmentsCount) return current;
      if (current.assignmentsCount < best.assignmentsCount) return best;

      // Якщо все інше однакове, залишаємо найстаріший запис
      return new Date(current.created_at) < new Date(best.created_at) ? current : best;
    });

    console.log(`✅ Залишаємо працівника:`);
    console.log(`   ID: ${keepWorker.id}`);
    console.log(`   Ім'я: ${keepWorker.name}`);
    console.log(`   Primary: ${keepWorker.is_primary ? 'Так' : 'Ні'}`);
    console.log(`   Прив'язок: ${keepWorker.assignmentsCount}`);
    console.log('');

    // Видаляємо дублікати
    const workersToDelete = workersWithAssignments.filter(w => w.id !== keepWorker.id);

    console.log(`🗑️  Видаляємо ${workersToDelete.length} дублікат(и)...\n`);

    for (const worker of workersToDelete) {
      // Спочатку переприв'язуємо всі робочі дні до залишеного працівника
      if (worker.assignmentsCount > 0) {
        console.log(`🔄 Переприв'язуємо ${worker.assignmentsCount} робочих днів від працівника ${worker.id} до ${keepWorker.id}...`);

        const { error: updateError } = await supabase
          .from('work_day_assignments')
          .update({ worker_id: keepWorker.id })
          .eq('worker_id', worker.id);

        if (updateError) {
          console.error(`❌ Помилка переприв'язки для працівника ${worker.id}:`, updateError);
          continue;
        }

        console.log(`✅ Переприв'язка завершена`);
      }

      // Тепер видаляємо працівника
      console.log(`🗑️  Видаляємо працівника ${worker.id}...`);

      const { error: deleteError } = await supabase
        .from('workers')
        .delete()
        .eq('id', worker.id);

      if (deleteError) {
        console.error(`❌ Помилка видалення працівника ${worker.id}:`, deleteError);
      } else {
        console.log(`✅ Працівника ${worker.id} видалено`);
      }
      console.log('');
    }

    console.log('🎉 Операція завершена успішно!');
    console.log(`✅ Залишився один працівник "Лідія" з ID: ${keepWorker.id}`);

  } catch (error) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  }
}

// Запускаємо скрипт
removeDuplicateWorkers();
