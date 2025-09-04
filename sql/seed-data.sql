-- IDs démo (fixes)
-- school_id  = aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- classroom_id = bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb

-- 1) Crée/assure l'école + la classe
INSERT INTO public.schools (id, name)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'École Démo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.classrooms (id, name, grade, school_id)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'CM2 A', 'CM2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO NOTHING;

-- 2) Quizzes publiés rattachés à CETTE classe/école
INSERT INTO public.quizzes (id, title, description, level, owner_id, classroom_id, school_id, is_published) VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Compter jusqu''à 10', 'Quiz de maths', 'CP', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true),
('b1c2d3e4-f5a6-7890-1234-567890abcdef', 'Les voyelles', 'Reconnaître les voyelles', 'CP', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true),
('d1e2f3a4-b5c6-7890-1234-567890abcdef', 'Tables d''addition', 'Addition jusqu''à 10', 'CE1', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true)
ON CONFLICT (id) DO NOTHING;

-- 3) Exemples d'invitations avec intended_role pour les tests
INSERT INTO public.invitation_links (id, school_id, classroom_id, intended_role, token, expires_at, created_by) VALUES
('inv1-1111-2222-3333-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'TEACHER', 'demo-teacher-token-123', '2025-12-31 23:59:59', 'demo-director-id'),
('inv2-1111-2222-3333-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'PARENT', 'demo-parent-token-456', '2025-12-31 23:59:59', 'demo-director-id')
ON CONFLICT (id) DO NOTHING;

-- 3) Items (⚠️ choices en JSONB + school_id/classroom_id)
INSERT INTO public.quiz_items (quiz_id, question, choices, answer_keys, order_index, school_id, classroom_id) VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef','Combien d''étoiles ? ⭐⭐⭐','[{"id":"a","text":"2"},{"id":"b","text":"3"},{"id":"c","text":"4"}]'::jsonb,ARRAY['b'],1,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
('a1b2c3d4-e5f6-7890-1234-567890abcdef','Après 5 ?','[{"id":"a","text":"4"},{"id":"b","text":"6"},{"id":"c","text":"7"}]'::jsonb,ARRAY['b'],2,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
('b1c2d3e4-f5a6-7890-1234-567890abcdef','Première lettre de "arbre" ?','[{"id":"a","text":"a"},{"id":"b","text":"r"},{"id":"c","text":"b"}]'::jsonb,ARRAY['a'],1,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
ON CONFLICT DO NOTHING;
