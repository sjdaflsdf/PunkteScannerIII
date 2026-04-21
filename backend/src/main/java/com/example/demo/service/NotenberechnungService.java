package com.example.demo.service;

import org.springframework.stereotype.Service;

    import java.util.List;

    @Service
    public class NotenberechnungService {

        private static final List<double[]> DEFAULT_GRADE_SCALE = List.of(
                new double[]{1.0, 95},
                new double[]{1.3, 90},
                new double[]{1.7, 85},
                new double[]{2.0, 80},
                new double[]{2.3, 75},
                new double[]{2.7, 70},
                new double[]{3.0, 65},
                new double[]{3.3, 60},
                new double[]{3.7, 55},
                new double[]{4.0, 50},
                new double[]{5.0, 0}
        );

        public double gradeFromPercent(double percent) {
            double clamped = Math.max(0, Math.min(100, percent));
            for (double[] entry : DEFAULT_GRADE_SCALE) {
                if (clamped >= entry[1]) {
                    return entry[0];
                }
            }
            return 5.0;
        }

        public double calculatePercent(double earnedPoints, double maxPoints) {
            if (maxPoints <= 0) {
                throw new IllegalArgumentException(
                        "maxPoints muss größer als 0 sein");
            }
            return (earnedPoints / maxPoints) * 100;
        }

        public double calculateGrade(double earnedPoints, double maxPoints) {
            double percent = calculatePercent(earnedPoints, maxPoints);
            return gradeFromPercent(percent);
        }

        public boolean isPassed(double grade) {
            return grade <= 4.0;
        }

}
