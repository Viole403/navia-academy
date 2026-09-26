package com.navia.academy.widgets

import android.app.Activity
import androidx.compose.runtime.Composable
import androidx.glance.GlanceModifier
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.unit.ColorProvider
import androidx.compose.ui.unit.dp

/** The four colours every widget draws with, resolved once per draw. */
internal data class WidgetPalette(
    val background: ColorProvider,
    val foreground: ColorProvider,
    val accent: ColorProvider,
    val muted: ColorProvider,
)

internal fun WidgetSnapshot.palette(): WidgetPalette = WidgetPalette(
    background = ColorProvider(background.toArgbOr(0xFF0B0F1A.toInt())),
    foreground = ColorProvider(foreground.toArgbOr(0xFFF2F2F5.toInt())),
    accent = ColorProvider(accent.toArgbOr(0xFF7BA05B.toInt())),
    muted = ColorProvider(muted.toArgbOr(0xFF8A8A93.toInt())),
)

/**
 * The frame every widget shares.
 *
 * Tapping opens the app from anywhere in the widget. There is nothing here worth
 * interacting with on its own — a widget is a glance, and a glance that offers a
 * button is a button nobody presses.
 */
@Composable
internal fun WidgetColumn(
    palette: WidgetPalette,
    vertical: Alignment.Vertical = Alignment.Vertical.CenterVertically,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(palette.background)
            .padding(14.dp)
            .clickable(actionStartActivity<Activity>()),
        verticalAlignment = vertical,
        horizontalAlignment = Alignment.Horizontal.Start,
    ) { content() }
}
