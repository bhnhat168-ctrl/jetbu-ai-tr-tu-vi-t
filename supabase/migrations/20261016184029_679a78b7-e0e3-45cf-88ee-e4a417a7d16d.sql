GRANT INSERT ON public.gps_checkins TO anon, authenticated;
DROP POLICY IF EXISTS "Submit checkins" ON public.gps_checkins;
CREATE POLICY "Submit checkins" ON public.gps_checkins FOR INSERT TO anon, authenticated
  WITH CHECK (company_code IS NOT NULL AND staff_name IS NOT NULL AND length(staff_name) BETWEEN 1 AND 120
    AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180
    AND photo_data LIKE 'data:image/jpeg;base64,%' AND length(photo_data) < 1500000);