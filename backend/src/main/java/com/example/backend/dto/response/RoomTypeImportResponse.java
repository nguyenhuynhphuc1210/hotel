package com.example.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomTypeImportResponse {
    private int totalRows;
    private int importedCount;
    private int failedCount;
    @Builder.Default
    private List<String> errors = new ArrayList<>();
}
