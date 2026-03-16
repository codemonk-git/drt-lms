import 'package:flutter/material.dart';

class AppTheme {
  // Common Colors (Refined for Soft Light Palette)
  static const Color primary = Color(0xFF818CF8);       // Indigo 400 (Softer)
  static const Color primaryDark = Color(0xFF6366F1);   // Indigo 500
  static const Color accent = Color(0xFF38BDF8);        // Sky 400

  // Current Palette (Switched to Neutral Light)
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFF1F5F9); // Lighter gray
  static const Color cardBg = Color(0xFFFFFFFF);
  static const Color sidebarBg = Color(0xFFF8FAFC);     // Near white
  static const Color onSurface = Color(0xFF1E293B);     // Slate 800
  static const Color onSurfaceMuted = Color(0xFF64748B); // Slate 500
  static const Color divider = Color(0xFFE2E8F0);       // Slate 200

  // Dark Palette (Keep for reference or dark mode support later)
  static const Color darkSurface = Color(0xFF1E1E2E);
  static const Color darkSurfaceVariant = Color(0xFF2A2A3E);
  static const Color darkCardBg = Color(0xFF252538);
  static const Color darkSidebarBg = Color(0xFF13131F);
  static const Color darkOnSurface = Color(0xFFE2E8F0);
  static const Color darkOnSurfaceMuted = Color(0xFF8892A4);
  static const Color darkDivider = Color(0xFF2E2E45);

  // Status Colors (Shared)
  static const Color statusNew = Color(0xFF6366F1);
  static const Color statusInterested = Color(0xFF0EA5E9);
  static const Color statusContacted = Color(0xFFF59E0B);
  static const Color statusQualified = Color(0xFF10B981);
  static const Color statusBrochure = Color(0xFF8B5CF6);
  static const Color statusWon = Color(0xFF22C55E);
  static const Color statusLost = Color(0xFFEF4444);

  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: const ColorScheme.light(
        primary: primary,
        secondary: accent,
        surface: surface,
        onSurface: onSurface,
      ),
      scaffoldBackgroundColor: sidebarBg,
      fontFamily: 'Inter',
      appBarTheme: const AppBarTheme(
        backgroundColor: surface,
        foregroundColor: onSurface,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: onSurface,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
        iconTheme: IconThemeData(color: onSurface),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceVariant,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: divider, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: primary, width: 1.5),
        ),
        hintStyle: const TextStyle(color: onSurfaceMuted, fontSize: 13),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: surfaceVariant,
        selectedColor: primary,
        labelStyle: const TextStyle(fontSize: 12, color: onSurface),
        side: const BorderSide(color: divider),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      ),
      dividerTheme: const DividerThemeData(color: divider, thickness: 1),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: cardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: primary),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        ),
      ),
    );
  }

  static ThemeData get dark {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: accent,
        surface: darkSurface,
        onSurface: darkOnSurface,
      ),
      scaffoldBackgroundColor: darkSurface,
      fontFamily: 'Roboto',
      appBarTheme: const AppBarTheme(
        backgroundColor: darkSurface,
        foregroundColor: darkOnSurface,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: darkOnSurface,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: darkSurfaceVariant,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: darkDivider, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: primary, width: 1.5),
        ),
        hintStyle: const TextStyle(color: darkOnSurfaceMuted, fontSize: 13),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: darkSurfaceVariant,
        selectedColor: primary,
        labelStyle: const TextStyle(fontSize: 12, color: darkOnSurface),
        side: const BorderSide(color: darkDivider),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      ),
      dividerTheme: const DividerThemeData(color: darkDivider, thickness: 1),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: darkCardBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: accent),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        ),
      ),
    );
  }
}
