-- Supabase の SQL Editor で1回だけ実行（追加のみ・既存データは変更しません）
-- 変更チェック用: 在庫(light)・売上・設定4行の内容ハッシュを返す。アプリ/APIは ?sig=1 でこれを呼ぶ。
create or replace function public.nobushop_sig()
returns jsonb
language sql
stable
set statement_timeout = '15s'
as $$
  select jsonb_build_object(
    'inv', (select jsonb_build_object('n', count(*),
              'h', coalesce(md5(string_agg(id || ':' || md5(coalesce(light::text, data->>'updatedAt', '')), ',' order by id)), ''))
            from public.inventory),
    'sales', (select jsonb_build_object('n', count(*),
              'h', coalesce(md5(string_agg(id || ':' || md5(data::text), ',' order by id)), ''))
            from public.sales),
    'cfg', (select coalesce(jsonb_object_agg(id, md5(data::text)), '{}'::jsonb)
            from public.app_settings
            where id in ('default','receipts','storePending','claudeProposals'))
  );
$$;
grant execute on function public.nobushop_sig() to anon, authenticated;
