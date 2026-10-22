const POST_SELECT = `
SELECT p.id,p.content,p.image_path,p.is_private,p.created_at,p.updated_at,
 u.id AS user_id,u.name,u.avatar_path,u.avatar_variant,u.job_title,u.employer,
 COUNT(r.reaction)::int AS reaction_count,
 ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.reaction), NULL) AS reaction_types,
 COALESCE(SUM(CASE WHEN r.reaction=1 THEN 1 ELSE 0 END),0)::int AS likes,
 COALESCE(MAX(CASE WHEN r.user_id=$1 THEN r.reaction END),0)::int AS my_reaction,
 (SELECT COUNT(*)::int FROM comments c WHERE c.post_id=p.id) AS comment_count,
 COALESCE((SELECT json_agg(preview ORDER BY preview.created_at ASC) FROM (
   SELECT c.id,c.user_id,c.content,c.created_at,cu.name,cu.avatar_path,cu.avatar_variant
   FROM comments c JOIN users cu ON cu.id=c.user_id
   WHERE c.post_id=p.id ORDER BY c.created_at DESC LIMIT 3
 ) preview),'[]'::json) AS preview_comments
FROM posts p JOIN users u ON u.id=p.user_id
LEFT JOIN reactions r ON r.post_id=p.id`;

module.exports = { POST_SELECT };
