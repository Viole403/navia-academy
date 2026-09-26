package com.navia.academy.widgets

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The bridge contract, checked on the native side.
 *
 * The payload is written by `JSON.stringify` in `src/lib/widget.ts`, and this
 * test is a copy of that exact string rather than a fixture invented here. That
 * is the whole point: the reader below is a hand-rolled regex scanner, and the
 * failure it risks is not an exception but silence — a changed key in TypeScript
 * would leave the home screen showing zeros with nothing logged anywhere. So the
 * two ends of the contract are pinned to each other by this file, and if the
 * payload shape moves, this fails instead of the widget quietly going blank.
 */
class WidgetStoreParseTest {

    private val live = """
    {"version":1,"updatedAt":1758900000000,"day":{"streak":12,"bestStreak":30,
    "studiedToday":true,"due":7,"minutesToday":18,"dailyGoalMinutes":20,
    "recent":[true,true,false,true,true,false,true]},
    "locale":"id","themeId":"forest",
    "colors":{"background":"#101418","foreground":"#F5F5F7",
    "accent":"#7BA05B","muted":"#9AA0A6"}}
    """.trimIndent()

    @Test
    fun `reads every field of a live payload`() {
        val s = WidgetStore.parse(live)
        assertEquals(12, s.streak)
        assertEquals(30, s.bestStreak)
        assertTrue(s.studiedToday)
        assertEquals(7, s.due)
        assertEquals(18, s.minutesToday)
        assertEquals(20, s.dailyGoalMinutes)
        assertEquals(1758900000000L, s.updatedAt)
        assertEquals("forest", s.themeId)
        assertEquals(listOf(true, true, false, true, true, false, true), s.recent)
    }

    @Test
    fun `reads colours out of the nested colors object`() {
        val s = WidgetStore.parse(live)
        assertEquals("#101418", s.background)
        assertEquals("#F5F5F7", s.foreground)
        assertEquals("#7BA05B", s.accent)
        assertEquals("#9AA0A6", s.muted)
    }

    @Test
    fun `a null due stays unknown rather than becoming zero`() {
        val s = WidgetStore.parse(live.replace("\"due\":7", "\"due\":null"))
        assertNull(s.due)
    }

    @Test
    fun `an empty payload still draws`() {
        val s = WidgetStore.parse("{}")
        assertEquals(0, s.streak)
        assertEquals(7, s.recent.size)
        assertEquals(20, s.dailyGoalMinutes)
        assertNull(s.due)
    }

    @Test
    fun `a truncated week strip is padded rather than throwing`() {
        val s = WidgetStore.parse(live.replaceFirst("true,false,true]}", "true]}"))
        assertEquals(7, s.recent.size)
    }

    @Test
    fun `negative and zero counts cannot reach the widget as negative`() {
        val s = WidgetStore.parse(live.replace("\"streak\":12", "\"streak\":-5"))
        assertEquals(0, s.streak)
    }

    @Test
    fun `a live but untouched streak reads as at risk`() {
        val s = WidgetStore.parse(live.replace("\"studiedToday\":true", "\"studiedToday\":false"))
        assertTrue(s.atRisk)
        assertEquals("atRisk", s.mood)
    }

    @Test
    fun `a finished day reads as celebrate`() {
        assertEquals("celebrate", WidgetStore.parse(live).mood)
    }

    @Test
    fun `goal progress is clamped to one`() {
        val s = WidgetStore.parse(live.replace("\"minutesToday\":18", "\"minutesToday\":999"))
        assertEquals(1f, s.goalProgress, 0.0001f)
    }
}
