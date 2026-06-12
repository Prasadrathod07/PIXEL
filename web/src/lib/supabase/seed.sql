-- ═══════════════════════════════════
-- SEED: AUTH USERS (run in Supabase Auth)
-- ═══════════════════════════════════
-- Create these users via Supabase Dashboard > Authentication > Users
-- Email: client1@pixeltest.com  Password: Test@1234  (client role)
-- Email: client2@pixeltest.com  Password: Test@1234  (client role)
-- Email: manager@pixeltest.com  Password: Test@1234  (manager role)

-- ═══════════════════════════════════
-- SEED: PUBLIC USERS
-- (Replace UUIDs with actual auth user IDs after creating above)
-- ═══════════════════════════════════

-- After creating auth users, insert into public.users:
insert into public.users (id, email, name, role) values
  ('REPLACE_WITH_CLIENT1_AUTH_ID', 'client1@pixeltest.com', 'Rahul Sharma', 'client'),
  ('REPLACE_WITH_CLIENT2_AUTH_ID', 'client2@pixeltest.com', 'Priya Patel', 'client'),
  ('REPLACE_WITH_MANAGER_AUTH_ID', 'manager@pixeltest.com', 'Martand Deshpande', 'manager');

-- ═══════════════════════════════════
-- SEED: SITES
-- ═══════════════════════════════════
insert into public.sites (id, name, url, status, last_checked, client_id) values
  ('11111111-1111-1111-1111-111111111111', 'Rahul E-Commerce', 'https://rahul-shop.com', 'online', now() - interval '5 minutes', 'REPLACE_WITH_CLIENT1_AUTH_ID'),
  ('22222222-2222-2222-2222-222222222222', 'Rahul Blog', 'https://rahul-blog.com', 'degraded', now() - interval '10 minutes', 'REPLACE_WITH_CLIENT1_AUTH_ID'),
  ('33333333-3333-3333-3333-333333333333', 'Priya Portfolio', 'https://priya-portfolio.com', 'down', now() - interval '2 hours', 'REPLACE_WITH_CLIENT2_AUTH_ID'),
  ('44444444-4444-4444-4444-444444444444', 'Priya Agency', 'https://priya-agency.com', 'online', now() - interval '3 minutes', 'REPLACE_WITH_CLIENT2_AUTH_ID');

-- ═══════════════════════════════════
-- SEED: ISSUES
-- ═══════════════════════════════════
insert into public.issues (id, title, description, type, severity, status, site_id, created_by) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Checkout page not loading on mobile', 'When users try to access the checkout page on mobile devices (iPhone and Android), the page shows a blank white screen. This started happening after the last deployment on November 10th. Desktop works fine. Affects approximately 60% of our traffic.', 'bug', 'critical', 'in_progress', '11111111-1111-1111-1111-111111111111', 'REPLACE_WITH_CLIENT1_AUTH_ID'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Payment gateway timing out frequently', 'Razorpay payment gateway is timing out after 10 seconds on approximately 30% of transactions. Customers are charged but not getting confirmation. Revenue impact is significant.', 'bug', 'high', 'in_review', '11111111-1111-1111-1111-111111111111', 'REPLACE_WITH_CLIENT1_AUTH_ID'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Add Google Analytics integration', 'We need Google Analytics 4 installed on the website to track user behavior. Currently we have no analytics data. Please add GA4 tracking code and configure goals for checkout completion.', 'improvement', 'medium', 'open', '11111111-1111-1111-1111-111111111111', 'REPLACE_WITH_CLIENT1_AUTH_ID'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Blog images loading very slowly', 'All images on the blog are taking 8-12 seconds to load. This is causing a very poor user experience. I think we need image optimization or a CDN.', 'bug', 'high', 'waiting_for_client', '22222222-2222-2222-2222-222222222222', 'REPLACE_WITH_CLIENT1_AUTH_ID'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Website completely down since 2 hours', 'My portfolio website is showing 502 Bad Gateway error. Client presentations are scheduled today and this is urgent. Need immediate fix.', 'bug', 'critical', 'open', '33333333-3333-3333-3333-333333333333', 'REPLACE_WITH_CLIENT2_AUTH_ID'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Contact form not sending emails', 'The contact form on the website submits successfully but I am not receiving any emails. Last email received was 3 days ago. Potential leads are being lost.', 'bug', 'high', 'resolved', '44444444-4444-4444-4444-444444444444', 'REPLACE_WITH_CLIENT2_AUTH_ID');

-- ═══════════════════════════════════
-- SEED: TIMELINE EVENTS
-- ═══════════════════════════════════
insert into public.timeline_events (issue_id, event_type, content, author_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'created', 'Issue reported', 'REPLACE_WITH_CLIENT1_AUTH_ID'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'status_changed', null, 'REPLACE_WITH_MANAGER_AUTH_ID'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'response_added', 'We have identified the issue. The mobile CSS bundle is missing after the last deployment. Our team is working on a hotfix and will deploy within 2 hours.', 'REPLACE_WITH_MANAGER_AUTH_ID'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'created', 'Issue reported', 'REPLACE_WITH_CLIENT1_AUTH_ID'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'status_changed', null, 'REPLACE_WITH_MANAGER_AUTH_ID'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'created', 'Issue reported', 'REPLACE_WITH_CLIENT1_AUTH_ID'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'created', 'Issue reported', 'REPLACE_WITH_CLIENT1_AUTH_ID'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'response_added', 'We have enabled image compression. Could you check if the images are still slow? We may need to migrate to Cloudinary for better CDN coverage.', 'REPLACE_WITH_MANAGER_AUTH_ID'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'status_changed', null, 'REPLACE_WITH_MANAGER_AUTH_ID'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'created', 'Issue reported - URGENT', 'REPLACE_WITH_CLIENT2_AUTH_ID'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'created', 'Issue reported', 'REPLACE_WITH_CLIENT2_AUTH_ID'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'response_added', 'Fixed! The SendGrid API key had expired. We have renewed it and email delivery is now working. Please test by submitting the contact form.', 'REPLACE_WITH_MANAGER_AUTH_ID'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'resolved', 'Issue resolved - email delivery restored', 'REPLACE_WITH_MANAGER_AUTH_ID');

insert into public.timeline_events (issue_id, event_type, old_value, new_value, author_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'status_changed', 'open', 'in_progress', 'REPLACE_WITH_MANAGER_AUTH_ID'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'status_changed', 'open', 'in_review', 'REPLACE_WITH_MANAGER_AUTH_ID'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'status_changed', 'in_progress', 'waiting_for_client', 'REPLACE_WITH_MANAGER_AUTH_ID'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'status_changed', 'in_progress', 'resolved', 'REPLACE_WITH_MANAGER_AUTH_ID');

-- ═══════════════════════════════════
-- SEED: NOTIFICATIONS
-- ═══════════════════════════════════
insert into public.notifications (user_id, issue_id, type, message, read) values
  ('REPLACE_WITH_CLIENT2_AUTH_ID', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'resolved', 'Your issue "Contact form not sending emails" has been resolved!', false),
  ('REPLACE_WITH_CLIENT1_AUTH_ID', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'response', 'Manager responded to your issue "Checkout page not loading on mobile"', false),
  ('REPLACE_WITH_CLIENT1_AUTH_ID', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'status', 'Your issue "Payment gateway timing out" is now In Review', true);
