-- A zero or negative daily queue is not a preference, it is a broken write: the
-- settings endpoint takes these three as bare integers with no constraint, so a
-- malformed client could store one and the learner would see an empty queue.
-- Clamp what is already stored; the write path validates from here on.
UPDATE user_settings SET new_words_per_day  = 1   WHERE new_words_per_day  < 1   OR new_words_per_day  > 200;
UPDATE user_settings SET max_reviews_per_day = 5   WHERE max_reviews_per_day < 5   OR max_reviews_per_day > 1000;
UPDATE user_settings SET daily_goal_min      = 1   WHERE daily_goal_min      < 1   OR daily_goal_min      > 240;
