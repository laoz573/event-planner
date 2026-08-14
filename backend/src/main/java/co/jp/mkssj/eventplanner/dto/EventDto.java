package co.jp.mkssj.eventplanner.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventDto {
    private Long id;
    private Integer year;
    private String name;
    private String owner;
    private String color;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate goalDate;
    private String goalColor;
    private List<CheckpointItem> checkpoints;
}
