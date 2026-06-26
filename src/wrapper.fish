# >>> claude-auto-retry >>>
function claude
    if test "$CLAUDE_AUTO_RETRY_ACTIVE" = "1"
        command claude $argv
        return $status
    end
    set -gx CLAUDE_AUTO_RETRY_ACTIVE 1
    node "__LAUNCHER_PATH__" $argv
    set -l _car_exit $status
    set -e CLAUDE_AUTO_RETRY_ACTIVE
    return $_car_exit
end
# <<< claude-auto-retry <<<
