// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "WallE",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "WallE",
            path: "Sources/WallE"
        )
    ]
)
