-- voice_gender never reached the audio: the manifest assigns a speaker per
-- vocabulary item, and the TTS client reads that rather than a user preference.
-- Web already dropped the field from its settings store, so this is the last
-- place still accepting it.
ALTER TABLE user_settings DROP COLUMN IF EXISTS voice_gender;
