-- Allow referrers to view basic referee data
CREATE POLICY "Referrers can view referees" ON users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM referrals 
    WHERE referrals.referrer_id = auth.uid() 
    AND referrals.referee_id = users.id
  )
);
