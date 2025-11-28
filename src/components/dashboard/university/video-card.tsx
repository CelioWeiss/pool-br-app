
"use client";

import Image from 'next/image';
import type { UniversityVideo } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, Trash2 } from 'lucide-react';

interface VideoCardProps {
    video: UniversityVideo;
    isMaster: boolean;
    onDelete: () => void;
}

export function VideoCard({ video, isMaster, onDelete }: VideoCardProps) {

    const openVideo = () => {
        window.open(video.videoUrl, '_blank');
    }

    return (
        <Card className="flex flex-col">
            <CardHeader className="p-0">
                <div className="relative aspect-video w-full">
                    <Image 
                        src={video.thumbnailUrl}
                        alt={`Thumbnail for ${video.title}`}
                        fill
                        className="object-cover rounded-t-lg"
                    />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-4">
                <CardTitle className="text-lg leading-tight mb-2">{video.title}</CardTitle>
                <CardDescription className="text-sm line-clamp-3">{video.description}</CardDescription>
            </CardContent>
            <CardFooter className="p-4 pt-0">
                <Button onClick={openVideo} className="w-full">
                    <PlayCircle className="mr-2 h-4 w-4" /> Assistir
                </Button>
                {isMaster && (
                    <Button onClick={onDelete} variant="ghost" size="icon" className="ml-2 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

    