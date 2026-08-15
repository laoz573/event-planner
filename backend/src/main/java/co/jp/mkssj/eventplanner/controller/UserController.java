package co.jp.mkssj.eventplanner.controller;

import co.jp.mkssj.eventplanner.dto.UserSummaryDto;
import co.jp.mkssj.eventplanner.repository.AppUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * イベント共有の相手を選ぶ画面(設定タブ)向けに、自分以外の既存ユーザー一覧を返すAPI。
 * ユーザー名・idのみを返し、パスワードハッシュ等の情報は一切含めない。
 * JwtAuthFilterによりこの下は全て認証必須(/api/users/* をFilterConfigに追加済み)。
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final AppUserRepository appUserRepository;

    @GetMapping
    public List<UserSummaryDto> list(HttpServletRequest request) {
        Long userId = currentUserId(request);
        return appUserRepository.findByIdNotOrderByUsernameAsc(userId).stream()
                .map(u -> UserSummaryDto.builder().id(u.getId()).username(u.getUsername()).build())
                .toList();
    }

    private Long currentUserId(HttpServletRequest request) {
        Object userId = request.getAttribute("userId");
        if (!(userId instanceof Long)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "認証が必要です");
        }
        return (Long) userId;
    }
}
