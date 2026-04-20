"use strict";

/**
 * Standard-Notenschluessel (konfigurierbar).
 * minPercent = Untergrenze in Prozent, ab der die Note gilt.
 * Reihenfolge muss absteigend sein.
 */
const DEFAULT_GRADE_SCALE = [
	{ grade: 1.0, minPercent: 95 },
	{ grade: 1.3, minPercent: 90 },
	{ grade: 1.7, minPercent: 85 },
	{ grade: 2.0, minPercent: 80 },
	{ grade: 2.3, minPercent: 75 },
	{ grade: 2.7, minPercent: 70 },
	{ grade: 3.0, minPercent: 65 },
	{ grade: 3.3, minPercent: 60 },
	{ grade: 3.7, minPercent: 55 },
	{ grade: 4.0, minPercent: 50 },
	{ grade: 5.0, minPercent: 0 },
];

/**
 * Prueft und sortiert den Notenschluessel robust.
 */
function normalizeGradeScale(scale) {
	if (!Array.isArray(scale) || scale.length === 0) {
		throw new Error("gradeScale muss ein nicht-leeres Array sein.");
	}

	const normalized = scale.map((entry) => {
		if (
			!entry ||
			typeof entry.grade !== "number" ||
			typeof entry.minPercent !== "number"
		) {
			throw new Error(
				"Jeder Notenschluessel-Eintrag braucht grade:number und minPercent:number."
			);
		}

		if (entry.minPercent < 0 || entry.minPercent > 100) {
			throw new Error("minPercent muss zwischen 0 und 100 liegen.");
		}

		return { grade: entry.grade, minPercent: entry.minPercent };
	});

	normalized.sort((a, b) => b.minPercent - a.minPercent);

	return normalized;
}

/**
 * Ermittelt die Note zu einem Prozentwert.
 */
function gradeFromPercent(percent, gradeScale = DEFAULT_GRADE_SCALE) {
	if (typeof percent !== "number" || Number.isNaN(percent)) {
		throw new Error("percent muss eine Zahl sein.");
	}

	const scale = normalizeGradeScale(gradeScale);
	const clampedPercent = Math.max(0, Math.min(100, percent));

	for (const entry of scale) {
		if (clampedPercent >= entry.minPercent) {
			return entry.grade;
		}
	}

	return scale[scale.length - 1].grade;
}

/**
 * Summiert Punkte einer Pruefung.
 * Beispiel fuer tasks:
 * [
 *   { id: "A1", earnedPoints: 7, maxPoints: 10 },
 *   { id: "A2", earnedPoints: 13, maxPoints: 20 }
 * ]
 */
function calculateTotals(tasks) {
	if (!Array.isArray(tasks) || tasks.length === 0) {
		throw new Error("tasks muss ein nicht-leeres Array sein.");
	}

	let earnedPoints = 0;
	let maxPoints = 0;

	for (const task of tasks) {
		if (
			!task ||
			typeof task.earnedPoints !== "number" ||
			typeof task.maxPoints !== "number"
		) {
			throw new Error(
				"Jede Aufgabe braucht earnedPoints:number und maxPoints:number."
			);
		}

		if (task.earnedPoints < 0 || task.maxPoints <= 0) {
			throw new Error("earnedPoints >= 0 und maxPoints > 0 erforderlich.");
		}

		if (task.earnedPoints > task.maxPoints) {
			throw new Error("earnedPoints darf maxPoints nicht uebersteigen.");
		}

		earnedPoints += task.earnedPoints;
		maxPoints += task.maxPoints;
	}

	return { earnedPoints, maxPoints };
}

/**
 * Hauptfunktion fuer die Auswertung einer Pruefung.
 */
function evaluateExam({ tasks, gradeScale = DEFAULT_GRADE_SCALE }) {
	const totals = calculateTotals(tasks);
	const percent = (totals.earnedPoints / totals.maxPoints) * 100;
	const grade = gradeFromPercent(percent, gradeScale);

	return {
		earnedPoints: Number(totals.earnedPoints.toFixed(2)),
		maxPoints: Number(totals.maxPoints.toFixed(2)),
		percent: Number(percent.toFixed(2)),
		grade,
		passed: grade <= 4.0,
	};
}

module.exports = {
	DEFAULT_GRADE_SCALE,
	normalizeGradeScale,
	gradeFromPercent,
	calculateTotals,
	evaluateExam,
};

