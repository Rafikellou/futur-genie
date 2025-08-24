-- Seed data for self-service quiz bank
-- These quizzes will have owner_id = NULL and classroom_id = NULL to make them available to all students

-- CP Level Quizzes
INSERT INTO quizzes (id, title, description, level, owner_id, classroom_id, is_published) VALUES
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Compter jusqu''à 10', 'Quiz de mathématiques pour apprendre à compter jusqu''à 10', 'CP', NULL, NULL, true),
    ('b1c2d3e4-f5a6-7890-1234-567890abcdef', 'Les voyelles', 'Reconnaître et identifier les voyelles', 'CP', NULL, NULL, true),
    ('c1d2e3f4-a5b6-7890-1234-567890abcdef', 'Addition simple', 'Additions avec des nombres de 1 à 5', 'CP', NULL, NULL, true);

-- CE1 Level Quizzes
INSERT INTO quizzes (id, title, description, level, owner_id, classroom_id, is_published) VALUES
    ('d1e2f3a4-b5c6-7890-1234-567890abcdef', 'Tables d''addition', 'Maîtriser les tables d''addition jusqu''à 10', 'CE1', NULL, NULL, true),
    ('e1f2a3b4-c5d6-7890-1234-567890abcdef', 'Lecture de mots', 'Lire et comprendre des mots simples', 'CE1', NULL, NULL, true),
    ('f1a2b3c4-d5e6-7890-1234-567890abcdef', 'Géométrie de base', 'Reconnaître les formes géométriques simples', 'CE1', NULL, NULL, true);

-- CE2 Level Quizzes
INSERT INTO quizzes (id, title, description, level, owner_id, classroom_id, is_published) VALUES
    ('a2b3c4d5-e6f7-8901-2345-678901abcdef', 'Multiplication', 'Tables de multiplication de 2 à 5', 'CE2', NULL, NULL, true),
    ('b2c3d4e5-f6a7-8901-2345-678901abcdef', 'Grammaire: le nom', 'Identifier les noms dans une phrase', 'CE2', NULL, NULL, true),
    ('c2d3e4f5-a6b7-8901-2345-678901abcdef', 'Les animaux', 'Classification des animaux domestiques et sauvages', 'CE2', NULL, NULL, true);

-- CM1 Level Quizzes
INSERT INTO quizzes (id, title, description, level, owner_id, classroom_id, is_published) VALUES
    ('d2e3f4a5-b6c7-8901-2345-678901abcdef', 'Fractions simples', 'Introduction aux fractions', 'CM1', NULL, NULL, true),
    ('e2f3a4b5-c6d7-8901-2345-678901abcdef', 'Conjugaison présent', 'Conjuguer les verbes du 1er groupe au présent', 'CM1', NULL, NULL, true),
    ('f2a3b4c5-d6e7-8901-2345-678901abcdef', 'La Préhistoire', 'Les grandes périodes de la Préhistoire', 'CM1', NULL, NULL, true);

-- CM2 Level Quizzes
INSERT INTO quizzes (id, title, description, level, owner_id, classroom_id, is_published) VALUES
    ('a3b4c5d6-e7f8-9012-3456-789012abcdef', 'Calcul mental', 'Calculs rapides et techniques', 'CM2', NULL, NULL, true),
    ('b3c4d5e6-f7a8-9012-3456-789012abcdef', 'Analyse grammaticale', 'Nature et fonction des mots', 'CM2', NULL, NULL, true),
    ('c3d4e5f6-a7b8-9012-3456-789012abcdef', 'La France', 'Régions et départements français', 'CM2', NULL, NULL, true);

-- Quiz items for CP Math 1 (Compter jusqu'à 10)
INSERT INTO quiz_items (quiz_id, question, choices, answer_keys, order_index) VALUES
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Combien y a-t-il d''étoiles ? ⭐⭐⭐', '[{"id": "a", "text": "2"}, {"id": "b", "text": "3"}, {"id": "c", "text": "4"}]', ARRAY['b'], 1),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Quel nombre vient après 5 ?', '[{"id": "a", "text": "4"}, {"id": "b", "text": "6"}, {"id": "c", "text": "7"}]', ARRAY['b'], 2),
    ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Combien font 2 + 3 ?', '[{"id": "a", "text": "4"}, {"id": "b", "text": "5"}, {"id": "c", "text": "6"}]', ARRAY['b'], 3);

-- Quiz items for CP French 1 (Les voyelles)
INSERT INTO quiz_items (quiz_id, question, choices, answer_keys, order_index) VALUES
    ('b1c2d3e4-f5a6-7890-1234-567890abcdef', 'Quelle est la première lettre du mot "arbre" ?', '[{"id": "a", "text": "a"}, {"id": "b", "text": "r"}, {"id": "c", "text": "b"}]', ARRAY['a'], 1),
    ('b1c2d3e4-f5a6-7890-1234-567890abcdef', 'Quelles sont les voyelles dans le mot "eau" ?', '[{"id": "a", "text": "e, a"}, {"id": "b", "text": "e, a, u"}, {"id": "c", "text": "a, u"}]', ARRAY['b'], 2),
    ('b1c2d3e4-f5a6-7890-1234-567890abcdef', 'Combien y a-t-il de voyelles dans le mot "école" ?', '[{"id": "a", "text": "2"}, {"id": "b", "text": "3"}, {"id": "c", "text": "4"}]', ARRAY['b'], 3);

-- Quiz items for CE1 Math 1 (Tables d'addition)
INSERT INTO quiz_items (quiz_id, question, choices, answer_keys, order_index) VALUES
    ('d1e2f3a4-b5c6-7890-1234-567890abcdef', 'Combien font 7 + 4 ?', '[{"id": "a", "text": "10"}, {"id": "b", "text": "11"}, {"id": "c", "text": "12"}]', ARRAY['b'], 1),
    ('d1e2f3a4-b5c6-7890-1234-567890abcdef', 'Combien font 6 + 5 ?', '[{"id": "a", "text": "11"}, {"id": "b", "text": "10"}, {"id": "c", "text": "12"}]', ARRAY['a'], 2),
    ('d1e2f3a4-b5c6-7890-1234-567890abcdef', 'Quel nombre complète : 8 + ? = 15', '[{"id": "a", "text": "6"}, {"id": "b", "text": "7"}, {"id": "c", "text": "8"}]', ARRAY['b'], 3);

-- Quiz items for CE2 Math 1 (Multiplication)
INSERT INTO quiz_items (quiz_id, question, choices, answer_keys, order_index) VALUES
    ('a2b3c4d5-e6f7-8901-2345-678901abcdef', 'Combien font 3 × 4 ?', '[{"id": "a", "text": "7"}, {"id": "b", "text": "12"}, {"id": "c", "text": "11"}]', ARRAY['b'], 1),
    ('a2b3c4d5-e6f7-8901-2345-678901abcdef', 'Combien font 5 × 3 ?', '[{"id": "a", "text": "15"}, {"id": "b", "text": "8"}, {"id": "c", "text": "13"}]', ARRAY['a'], 2),
    ('a2b3c4d5-e6f7-8901-2345-678901abcdef', 'Dans 4 × 6, quel est le résultat ?', '[{"id": "a", "text": "22"}, {"id": "b", "text": "24"}, {"id": "c", "text": "26"}]', ARRAY['b'], 3);

-- Quiz items for CM1 Math 1 (Fractions simples)
INSERT INTO quiz_items (quiz_id, question, choices, answer_keys, order_index) VALUES
    ('d2e3f4a5-b6c7-8901-2345-678901abcdef', 'Quelle fraction représente la moitié ?', '[{"id": "a", "text": "1/3"}, {"id": "b", "text": "1/2"}, {"id": "c", "text": "2/3"}]', ARRAY['b'], 1),
    ('d2e3f4a5-b6c7-8901-2345-678901abcdef', 'Combien font 1/4 + 1/4 ?', '[{"id": "a", "text": "1/2"}, {"id": "b", "text": "2/8"}, {"id": "c", "text": "1/8"}]', ARRAY['a'], 2),
    ('d2e3f4a5-b6c7-8901-2345-678901abcdef', 'Quelle fraction est la plus grande ?', '[{"id": "a", "text": "1/3"}, {"id": "b", "text": "1/4"}, {"id": "c", "text": "1/2"}]', ARRAY['c'], 3);

-- Quiz items for CM2 French 1 (Analyse grammaticale)
INSERT INTO quiz_items (quiz_id, question, choices, answer_keys, order_index) VALUES
    ('b3c4d5e6-f7a8-9012-3456-789012abcdef', 'Dans la phrase "Le chat mange sa nourriture", quel est le sujet ?', '[{"id": "a", "text": "chat"}, {"id": "b", "text": "Le chat"}, {"id": "c", "text": "mange"}]', ARRAY['b'], 1),
    ('b3c4d5e6-f7a8-9012-3456-789012abcdef', 'Quelle est la nature du mot "rapidement" ?', '[{"id": "a", "text": "adjectif"}, {"id": "b", "text": "adverbe"}, {"id": "c", "text": "nom"}]', ARRAY['b'], 2),
    ('b3c4d5e6-f7a8-9012-3456-789012abcdef', 'Dans "Marie lit un livre passionnant", quel mot est un adjectif ?', '[{"id": "a", "text": "Marie"}, {"id": "b", "text": "livre"}, {"id": "c", "text": "passionnant"}]', ARRAY['c'], 3);