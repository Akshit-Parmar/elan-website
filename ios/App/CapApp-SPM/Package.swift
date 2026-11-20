// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.6.2"),
        .package(name: "CapacitorApp", path: "../../../../../../web-review/source/Elan-GitHub-Deployment/node_modules/@capacitor/app"),
        .package(name: "CapacitorBrowser", path: "../../../../../../web-review/source/Elan-GitHub-Deployment/node_modules/@capacitor/browser"),
        .package(name: "CapacitorFilesystem", path: "../../../../../../web-review/source/Elan-GitHub-Deployment/node_modules/@capacitor/filesystem"),
        .package(name: "CapacitorShare", path: "../../../../../../web-review/source/Elan-GitHub-Deployment/node_modules/@capacitor/share")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorBrowser", package: "CapacitorBrowser"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorShare", package: "CapacitorShare")
            ]
        )
    ]
)
