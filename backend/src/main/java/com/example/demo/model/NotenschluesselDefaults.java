package com.example.demo.model;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class NotenschluesselDefaults {

    private static final Object[][] STUFEN = {
            {"1,0", 96, "#4CAF50"},
            {"1,3", 90, "#4CAF50"},
            {"1,7", 85, "#66BB6A"},
            {"2,0", 80, "#8BC34A"},
            {"2,3", 75, "#8BC34A"},
            {"2,7", 70, "#AED581"},
            {"3,0", 65, "#FF9800"},
            {"3,3", 60, "#FF9800"},
            {"3,7", 55, "#FFA726"},
            {"4,0", 50, "#F44336"},
            {"5,0", 0, "#B71C1C"},
    };

    public static List<Map<String, Object>> getDefaultStufen() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] stufe : STUFEN) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("note", stufe[0]);
            map.put("schwelle", stufe[1]);
            map.put("color", stufe[2]);
            result.add(map);
        }
        return result;
    }
}
