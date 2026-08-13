package co.jp.mkssj.eventplanner.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthResponseDto {
    private String token;
    private Long userId;
    private String username;
}
