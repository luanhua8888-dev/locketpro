-- Chạy đoạn lệnh này trong SQL Editor của Supabase để tự động thêm user vào bảng profiles

-- 1. Tạo function xử lý
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, email)
  values (new.id, new.raw_user_meta_data->>'username', new.email);
  return new;
end;
$$;

-- 2. Gắn function này thành Trigger (sẽ tự chạy mỗi khi có người mới tạo tài khoản)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
