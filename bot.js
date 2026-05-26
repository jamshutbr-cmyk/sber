require('dotenv').config();
const { 
    Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers // Добавлено для работы с участниками
    ]
});

// Конфигурация каналов
const channelConfig = {
    categories: [
        {
            name: '📢 ИНФОРМАЦИЯ',
            channels: [
                { name: '📰-новости', type: ChannelType.GuildText, topic: 'Последние новости сервера' },
                { name: '📝-changelog', type: ChannelType.GuildText, topic: 'История обновлений сервера' },
                { name: '📋-правила', type: ChannelType.GuildText, topic: 'Правила сервера' },
                { name: '🎉-события', type: ChannelType.GuildText, topic: 'Анонсы событий и мероприятий' }
            ]
        },
        {
            name: '🎮 ИГРОВЫЕ КАНАЛЫ',
            channels: [
                { name: '💬-общий-чат', type: ChannelType.GuildText, topic: 'Общение игроков' },
                { name: '❓-помощь', type: ChannelType.GuildText, topic: 'Задавайте вопросы здесь' },
                { name: '🐛-баг-репорты', type: ChannelType.GuildText, topic: 'Сообщения об ошибках' },
                { name: '💡-предложения', type: ChannelType.GuildText, topic: 'Ваши идеи для сервера' }
            ]
        },
        {
            name: '🔊 ГОЛОСОВЫЕ КАНАЛЫ',
            channels: [
                { name: '🎤 Общий голосовой', type: ChannelType.GuildVoice, userLimit: 0 },
                { name: '🎮 Игровая #1', type: ChannelType.GuildVoice, userLimit: 10 },
                { name: '🎮 Игровая #2', type: ChannelType.GuildVoice, userLimit: 10 },
                { name: '🎮 Игровая #3', type: ChannelType.GuildVoice, userLimit: 10 },
                { name: '🔒 Создать комнату', type: ChannelType.GuildVoice, userLimit: 1, isPrivateHub: true },
                { name: '🎵 AFK', type: ChannelType.GuildVoice, userLimit: 0, isAFK: true }
            ]
        },
        {
            name: '🛡️ АДМИНИСТРАЦИЯ',
            isPrivate: true,
            allowedRoles: ['👑 Администратор', '🛡️ Модератор'],
            channels: [
                { name: '📋-админ-чат', type: ChannelType.GuildText, topic: 'Общение администрации' },
                { name: '📊-логи', type: ChannelType.GuildText, topic: 'Логи модерации и событий' },
                { name: '⚙️-команды', type: ChannelType.GuildText, topic: 'Команды для управления сервером' },
                { name: '🔊 Админ-войс', type: ChannelType.GuildVoice, userLimit: 0 }
            ]
        },
        {
            name: '👑 ТОЛЬКО АДМИНИСТРАТОРЫ',
            isPrivate: true,
            allowedRoles: ['👑 Администратор'],
            channels: [
                { name: '🔐-приватный', type: ChannelType.GuildText, topic: 'Только для администраторов' },
                { name: '🔊 Приватный войс', type: ChannelType.GuildVoice, userLimit: 5 }
            ]
        }
    ]
};

// Хранилище предупреждений
const warnings = new Map(); // userId -> [{reason, moderator, date}]

// Хранилище приватных комнат: voiceChannelId -> { ownerId, textChannelId }
const privateRooms = new Map();

// Функция для отправки логов в канал логов
async function sendLog(guild, embed) {
    const logChannel = guild.channels.cache.find(ch => ch.name === '📊-логи');
    if (logChannel) {
        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
}

// Функция заполнения каналов контентом (вызывается из !setup и !fill)
async function fillChannels(guild) {
    // Заполняем канал команд информацией
    const commandsChannel = guild.channels.cache.find(ch => ch.name === '⚙️-команды');
    if (commandsChannel) {
        await commandsChannel.bulkDelete(20).catch(() => {});
        await commandsChannel.send({ embeds: [{ color: 0x5865F2, title: '⚙️ Справочник команд бота', description: 'Полный список всех команд для управления сервером', fields: [{ name: '📋 НАСТРОЙКА СЕРВЕРА', value: '```\n!setup - Создать/обновить структуру каналов и ролей\n!fill - Заполнить каналы контентом заново\n```' }, { name: '📢 ОБЪЯВЛЕНИЯ', value: '```\n!announce <текст> - Опубликовать новость\n!changelog <текст> - Добавить запись в changelog\n```' }, { name: '🛡️ МОДЕРАЦИЯ', value: '```\n!kick @user [причина]\n!ban @user [причина]\n!unban <ID>\n!mute @user <время> [причина]\n!unmute @user\n!warn @user <причина>\n!warnings @user\n!clearwarns @user\n!clear <число>\n```' }, { name: '🎭 РОЛИ', value: '```\n!giverole @user @роль\n!removerole @user @роль\n```' }, { name: 'ℹ️ ИНФОРМАЦИЯ', value: '```\n!help - Показать список команд\n```' }], footer: { text: 'Все команды логируются в канале 📊-логи' }, timestamp: new Date() }] });
        console.log('✅ Канал команд заполнен');
    }

    // Заполняем канал новостей
    const newsChannel = guild.channels.cache.find(ch => ch.name === '📰-новости');
    if (newsChannel) {
        await newsChannel.bulkDelete(20).catch(() => {});
        await newsChannel.send({ embeds: [{ color: 0x5865F2, title: '📰 Добро пожаловать на сервер!', description: 'Здесь будут публиковаться все важные новости и объявления сервера.', fields: [{ name: '🎮 О сервере', value: 'Это официальный Discord сервер нашего Minecraft сообщества.' }, { name: '📢 Следите за новостями', value: '• Важные объявления\n• Информация об обновлениях\n• Анонсы событий\n• Технические работы' }, { name: '🔔 Не пропустите', value: 'Рекомендуем включить уведомления для этого канала!' }], timestamp: new Date(), footer: { text: 'Администрация сервера' } }] });
        console.log('✅ Канал новостей заполнен');
    }

    // Заполняем канал changelog
    const changelogChannel = guild.channels.cache.find(ch => ch.name === '📝-changelog');
    if (changelogChannel) {
        await changelogChannel.bulkDelete(20).catch(() => {});
        await changelogChannel.send({ embeds: [{ color: 0x57F287, title: '🎉 Версия 1.0.0 - Запуск сервера', description: '**Дата:** ' + new Date().toLocaleDateString('ru-RU'), fields: [{ name: '✨ Добавлено', value: '• Создана структура Discord сервера\n• Настроены роли и права доступа\n• Добавлена система модерации\n• Созданы информационные каналы' }, { name: '🤖 Бот', value: '• Система модерации (kick, ban, mute, warn)\n• Автоматическое логирование\n• Система предупреждений' }], footer: { text: 'Следите за обновлениями!' }, timestamp: new Date() }] });
        console.log('✅ Канал changelog заполнен');
    }

    // Заполняем канал правил
    const rulesChannel = guild.channels.cache.find(ch => ch.name === '📋-правила');
    if (rulesChannel) {
        await rulesChannel.bulkDelete(20).catch(() => {});
        await rulesChannel.send({ embeds: [{ color: 0xFF0000, title: '📋 ПРАВИЛА СЕРВЕРА', description: '**Находясь на сервере, вы автоматически соглашаетесь с данными правилами.**\n\nНарушение правил влечет за собой наказание: предупреждение, мут, кик или бан.', timestamp: new Date() }] });
        await rulesChannel.send({ embeds: [{ color: 0xED4245, title: '🚫 ОБЩИЕ ПРАВИЛА', fields: [{ name: '1️⃣ Уважение', value: 'Уважайте всех участников сервера. Запрещены оскорбления, унижения и дискриминация.' }, { name: '2️⃣ Спам и флуд', value: 'Запрещен спам, флуд и злоупотребление CAPS LOCK.' }, { name: '3️⃣ Реклама', value: 'Запрещена реклама других серверов без разрешения администрации.' }, { name: '4️⃣ NSFW контент', value: 'Строго запрещен контент 18+ и gore.' }, { name: '5️⃣ Личная информация', value: 'Запрещен доксинг — публикация личных данных других людей.' }] }] });
        await rulesChannel.send({ embeds: [{ color: 0x57F287, title: '✅ ЗАКЛЮЧЕНИЕ', description: 'Спасибо за прочтение правил! Соблюдайте их, и мы создадим дружелюбное сообщество.\n\n**Приятной игры!** 🎮', footer: { text: 'По всем вопросам обращайтесь к администрации' } }] });
        console.log('✅ Канал правил заполнен');
    }

    // Заполняем канал событий
    const eventsChannel = guild.channels.cache.find(ch => ch.name === '🎉-события');
    if (eventsChannel) {
        await eventsChannel.bulkDelete(20).catch(() => {});
        await eventsChannel.send({ embeds: [{ color: 0xFEE75C, title: '🎉 СОБЫТИЯ И МЕРОПРИЯТИЯ', description: 'В этом канале публикуются анонсы всех событий, конкурсов и мероприятий на сервере!', fields: [{ name: '📅 Что здесь публикуется?', value: '• Конкурсы и турниры\n• Праздничные события\n• Совместные проекты\n• Розыгрыши призов' }, { name: '🏆 Награды', value: 'За участие вы можете получить игровые предметы, особые роли и привилегии!' }, { name: '🔔 Следите за обновлениями', value: 'Включите уведомления для этого канала!' }], footer: { text: 'Скоро здесь появятся первые события!' }, timestamp: new Date() }] });
        console.log('✅ Канал событий заполнен');
    }
}

client.once('ready', async () => {
    console.log(`✅ Бот ${client.user.tag} успешно запущен!`);
    console.log(`🆔 Client ID: ${process.env.CLIENT_ID}`);
    // Установка статуса бота
    client.user.setPresence({
        activities: [{ name: 'Minecraft Server | !help' }],
        status: 'online'
    });
});

// Команда для создания структуры каналов
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Команда !setup - создает все каналы и роли
    if (message.content === '!setup' && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply('🔧 Проверяю существующую структуру и создаю недостающие элементы...');
        
        try {
            const guild = message.guild;
            let createdRoles = 0;
            let skippedRoles = 0;
            let createdChannels = 0;
            let skippedChannels = 0;
            
            // Создаем роли (проверяем существование)
            console.log('🎭 Проверка и создание ролей...');
            
            const rolesToCreate = [
                { name: '👑 Администратор', color: 0xFF0000, permissions: [PermissionFlagsBits.Administrator] },
                { name: '🛡️ Модератор', color: 0x00FF00, permissions: [PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.MoveMembers] },
                { name: '💎 Помощник', color: 0x00FFFF, permissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.MuteMembers] },
                { name: '⭐ VIP', color: 0xFFD700, permissions: [] },
                { name: '🎮 Игрок', color: 0x808080, permissions: [] }
            ];
            
            for (const roleData of rolesToCreate) {
                const existingRole = guild.roles.cache.find(r => r.name === roleData.name);
                if (existingRole) {
                    console.log(`⏭️ Роль уже существует: ${roleData.name}`);
                    skippedRoles++;
                } else {
                    await guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        permissions: roleData.permissions,
                        hoist: true
                    });
                    console.log(`✅ Создана роль: ${roleData.name}`);
                    createdRoles++;
                }
            }
            
            if (createdRoles > 0) {
                await message.channel.send(`✅ Создано ролей: ${createdRoles}, пропущено: ${skippedRoles}`);
            }
            
            let afkChannel = null;
            
            for (const categoryConfig of channelConfig.categories) {
                // Проверяем существование категории
                let category = guild.channels.cache.find(
                    ch => ch.type === ChannelType.GuildCategory && ch.name === categoryConfig.name
                );
                
                if (category) {
                    console.log(`⏭️ Категория уже существует: ${categoryConfig.name}`);
                } else {
                    // Создаем категорию
                    const categoryOptions = {
                        name: categoryConfig.name,
                        type: ChannelType.GuildCategory
                    };
                    
                    // Если категория приватная, настраиваем права доступа
                    if (categoryConfig.isPrivate && categoryConfig.allowedRoles) {
                        const permissionOverwrites = [
                            {
                                id: guild.id, // @everyone
                                deny: [PermissionFlagsBits.ViewChannel]
                            }
                        ];
                        
                        // Добавляем доступ для разрешённых ролей
                        for (const roleName of categoryConfig.allowedRoles) {
                            const role = guild.roles.cache.find(r => r.name === roleName);
                            if (role) {
                                permissionOverwrites.push({
                                    id: role.id,
                                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.Connect]
                                });
                            }
                        }
                        
                        categoryOptions.permissionOverwrites = permissionOverwrites;
                    }
                    
                    category = await guild.channels.create(categoryOptions);
                    console.log(`✅ Создана категория: ${categoryConfig.name}`);
                }
                
                // Создаем каналы в категории
                for (const channelInfo of categoryConfig.channels) {
                    // Проверяем существование канала
                    const existingChannel = guild.channels.cache.find(
                        ch => ch.name === channelInfo.name && ch.type === channelInfo.type
                    );
                    
                    if (existingChannel) {
                        console.log(`  ⏭️ Канал уже существует: ${channelInfo.name}`);
                        skippedChannels++;
                        
                        // Если это AFK канал, сохраняем его
                        if (channelInfo.isAFK) {
                            afkChannel = existingChannel;
                        }
                        continue;
                    }
                    
                    const channelOptions = {
                        name: channelInfo.name,
                        type: channelInfo.type,
                        parent: category.id
                    };
                    
                    if (channelInfo.topic) {
                        channelOptions.topic = channelInfo.topic;
                    }
                    
                    if (channelInfo.userLimit !== undefined) {
                        channelOptions.userLimit = channelInfo.userLimit;
                    }
                    
                    // Для канала новостей делаем только чтение для обычных пользователей
                    if (channelInfo.name.includes('новости') || channelInfo.name.includes('changelog') || channelInfo.name.includes('правила')) {
                        channelOptions.permissionOverwrites = [
                            {
                                id: guild.id,
                                deny: [PermissionFlagsBits.SendMessages]
                            }
                        ];
                    }
                    
                    // Для AFK канала запрещаем говорить
                    if (channelInfo.isAFK) {
                        channelOptions.permissionOverwrites = [
                            {
                                id: guild.id,
                                deny: [PermissionFlagsBits.Speak]
                            }
                        ];
                    }
                    
                    // Для приватных категорий наследуем права от категории
                    if (categoryConfig.isPrivate && categoryConfig.allowedRoles) {
                        const permissionOverwrites = [
                            {
                                id: guild.id, // @everyone
                                deny: [PermissionFlagsBits.ViewChannel]
                            }
                        ];
                        
                        // Добавляем доступ для разрешённых ролей
                        for (const roleName of categoryConfig.allowedRoles) {
                            const role = guild.roles.cache.find(r => r.name === roleName);
                            if (role) {
                                const allowPerms = [PermissionFlagsBits.ViewChannel];
                                
                                // Для текстовых каналов добавляем права на сообщения
                                if (channelInfo.type === ChannelType.GuildText) {
                                    allowPerms.push(PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory);
                                }
                                
                                // Для голосовых каналов добавляем права на подключение и говорение
                                if (channelInfo.type === ChannelType.GuildVoice) {
                                    allowPerms.push(PermissionFlagsBits.Connect, PermissionFlagsBits.Speak);
                                }
                                
                                permissionOverwrites.push({
                                    id: role.id,
                                    allow: allowPerms
                                });
                            }
                        }
                        
                        channelOptions.permissionOverwrites = permissionOverwrites;
                    }
                    
                    const createdChannel = await guild.channels.create(channelOptions);
                    createdChannels++;
                    
                    // Сохраняем AFK канал для установки в настройках сервера
                    if (channelInfo.isAFK) {
                        afkChannel = createdChannel;
                    }
                    
                    console.log(`  ✅ Создан канал: ${channelInfo.name}`);
                }
            }
            
            if (afkChannel) {
                await guild.setAFKChannel(afkChannel.id);
                await guild.setAFKTimeout(300); // 5 минут
                console.log('✅ AFK канал установлен в настройках сервера');
            }
            
            // Заполняем каналы контентом
            if (createdChannels > 0) {
                await fillChannels(guild);
            }

            // LEGACY BLOCK START (disabled)
            const commandsChannel = null; // disabled
            if (false) {
                 await commandsChannel.send({
                    embeds: [{
                        color: 0x5865F2,
                        title: '⚙️ Справочник команд бота',
                        description: 'Полный список всех команд для управления сервером',
                        fields: [
                            {
                                name: '📋 НАСТРОЙКА СЕРВЕРА',
                                value: '```\n!setup - Создать/обновить структуру каналов и ролей\n```'
                            },
                            {
                                name: '📢 ОБЪЯВЛЕНИЯ',
                                value: '```\n!announce <текст> - Опубликовать новость\n!changelog <текст> - Добавить запись в changelog\n```'
                            },
                            {
                                name: '🛡️ МОДЕРАЦИЯ - НАКАЗАНИЯ',
                                value: '```\n!kick @user [причина] - Кикнуть пользователя\n!ban @user [причина] - Забанить пользователя\n!unban <ID> - Разбанить по ID\n!mute @user <время> [причина] - Замутить (10m, 1h, 1d)\n!unmute @user - Снять мут\n```'
                            },
                            {
                                name: '⚠️ МОДЕРАЦИЯ - ПРЕДУПРЕЖДЕНИЯ',
                                value: '```\n!warn @user <причина> - Выдать предупреждение\n!warnings @user - Посмотреть предупреждения\n!clearwarns @user - Очистить предупреждения\n```'
                            },
                            {
                                name: '🗑️ ОЧИСТКА СООБЩЕНИЙ',
                                value: '```\n!clear <число> - Удалить сообщения (1-100)\n```'
                            },
                            {
                                name: '🎭 УПРАВЛЕНИЕ РОЛЯМИ',
                                value: '```\n!giverole @user @роль - Выдать роль\n!removerole @user @роль - Забрать роль\n```'
                            },
                            {
                                name: 'ℹ️ ИНФОРМАЦИЯ',
                                value: '```\n!help - Показать список команд\n```'
                            }
                        ],
                        footer: { text: 'Все команды логируются в канале 📊-логи' },
                        timestamp: new Date()
                    }]
                });
                
                await commandsChannel.send({
                    embeds: [{
                        color: 0xFFA500,
                        title: '📝 Примеры использования команд',
                        fields: [
                            {
                                name: '🔨 Бан пользователя',
                                value: '```!ban @User Использование читов```'
                            },
                            {
                                name: '🔇 Мут на 30 минут',
                                value: '```!mute @User 30m Спам в чате```'
                            },
                            {
                                name: '⚠️ Предупреждение',
                                value: '```!warn @User Нарушение правил сервера```'
                            },
                            {
                                name: '🗑️ Очистка 50 сообщений',
                                value: '```!clear 50```'
                            },
                            {
                                name: '📢 Публикация новости',
                                value: '```!announce Сервер обновлен до версии 1.20! Добавлены новые биомы.```'
                            },
                            {
                                name: '📝 Добавление в changelog',
                                value: '```!changelog\n- Исправлен баг с дюпом\n- Добавлен новый спавн\n- Оптимизация производительности```'
                            }
                        ],
                        footer: { text: 'Используйте команды ответственно!' }
                    }]
                });
                
                await commandsChannel.send({
                    embeds: [{
                        color: 0x00FF00,
                        title: '⏱️ Форматы времени для мута',
                        description: 'При использовании команды `!mute` можно указывать время в следующих форматах:',
                        fields: [
                            {
                                name: 'Секунды',
                                value: '```30s - 30 секунд```',
                                inline: true
                            },
                            {
                                name: 'Минуты',
                                value: '```10m - 10 минут```',
                                inline: true
                            },
                            {
                                name: 'Часы',
                                value: '```2h - 2 часа```',
                                inline: true
                            },
                            {
                                name: 'Дни',
                                value: '```7d - 7 дней```',
                                inline: true
                            },
                            {
                                name: 'Максимум',
                                value: '```28d - 28 дней```',
                                inline: true
                            },
                            {
                                name: 'Примеры',
                                value: '```!mute @User 5m Флуд\n!mute @User 1h Токсичность\n!mute @User 1d Серьезное нарушение```',
                                inline: false
                            }
                        ]
                    }]
                });
                
                await commandsChannel.send({
                    embeds: [{
                        color: 0xFF0000,
                        title: '⚠️ ВАЖНО - Права и иерархия',
                        description: 'Обратите внимание на следующие моменты:',
                        fields: [
                            {
                                name: '🔺 Иерархия ролей',
                                value: 'Вы не можете модерировать пользователей с ролью выше или равной вашей. Убедитесь, что роль бота находится выше всех модерируемых ролей.'
                            },
                            {
                                name: '📊 Логирование',
                                value: 'Все действия модерации автоматически записываются в канал 📊-логи. Это помогает отслеживать историю наказаний.'
                            },
                            {
                                name: '💬 Уведомления',
                                value: 'Пользователи получают личные сообщения о наказаниях (если у них открыты ЛС). В сообщении указывается причина и модератор.'
                            },
                            {
                                name: '🔄 Предупреждения',
                                value: 'Система предупреждений хранится в памяти бота. При перезапуске бота предупреждения сбрасываются.'
                            }
                        ],
                        footer: { text: 'Используйте команды модерации справедливо и обоснованно!' }
                    }]
                });
                
                console.log('✅ Канал команд заполнен информацией');
            }
            
            // Заполняем канал новостей
            const newsChannel = guild.channels.cache.find(ch => ch.name === '📰-новости');
            if (newsChannel && createdChannels > 0) {
                await newsChannel.send({
                    embeds: [{
                        color: 0x5865F2,
                        title: '📰 Добро пожаловать на сервер!',
                        description: 'Здесь будут публиковаться все важные новости и объявления сервера.',
                        fields: [
                            {
                                name: '🎮 О сервере',
                                value: 'Это официальный Discord сервер нашего Minecraft сообщества. Здесь вы можете общаться с другими игроками, получать помощь и быть в курсе всех обновлений!'
                            },
                            {
                                name: '📢 Следите за новостями',
                                value: 'В этом канале администрация будет публиковать:\n• Важные объявления\n• Информацию об обновлениях\n• Анонсы событий\n• Технические работы'
                            },
                            {
                                name: '🔔 Не пропустите',
                                value: 'Рекомендуем включить уведомления для этого канала, чтобы не пропустить важную информацию!'
                            }
                        ],
                        thumbnail: { url: 'https://i.imgur.com/AfFp7pu.png' },
                        timestamp: new Date(),
                        footer: { text: 'Администрация сервера' }
                    }]
                });
                console.log('✅ Канал новостей заполнен');
            }
            
            // Заполняем канал changelog
            const changelogChannel = guild.channels.cache.find(ch => ch.name === '📝-changelog');
            if (changelogChannel && createdChannels > 0) {
                await changelogChannel.send({
                    embeds: [{
                        color: 0x00FF00,
                        title: '📝 История обновлений',
                        description: 'В этом канале публикуется полная история изменений и обновлений сервера.',
                        timestamp: new Date()
                    }]
                });
                
                await changelogChannel.send({
                    embeds: [{
                        color: 0x57F287,
                        title: '🎉 Версия 1.0.0 - Запуск сервера',
                        description: '**Дата:** ' + new Date().toLocaleDateString('ru-RU'),
                        fields: [
                            {
                                name: '✨ Добавлено',
                                value: '• Создана структура Discord сервера\n• Настроены роли и права доступа\n• Добавлена система модерации\n• Созданы информационные каналы\n• Настроены голосовые каналы'
                            },
                            {
                                name: '🤖 Бот',
                                value: '• Система модерации (kick, ban, mute, warn)\n• Автоматическое логирование действий\n• Команды для управления сервером\n• Система предупреждений'
                            },
                            {
                                name: '🎮 Игровые каналы',
                                value: '• Общий чат для игроков\n• Канал помощи\n• Баг-репорты\n• Предложения по улучшению'
                            },
                            {
                                name: '🔊 Голосовые каналы',
                                value: '• 3 игровых канала (лимит 10 человек)\n• Общий голосовой канал\n• Приватный канал\n• AFK канал с автоматическим перемещением'
                            }
                        ],
                        footer: { text: 'Следите за обновлениями!' },
                        timestamp: new Date()
                    }]
                });
                console.log('✅ Канал changelog заполнен');
            }
            
            // Заполняем канал правил
            const rulesChannel = guild.channels.cache.find(ch => ch.name === '📋-правила');
            if (rulesChannel && createdChannels > 0) {
                await rulesChannel.send({
                    embeds: [{
                        color: 0xFF0000,
                        title: '📋 ПРАВИЛА СЕРВЕРА',
                        description: '**Находясь на сервере, вы автоматически соглашаетесь с данными правилами.**\n\nНарушение правил влечет за собой наказание: предупреждение, мут, кик или бан.',
                        timestamp: new Date()
                    }]
                });
                
                await rulesChannel.send({
                    embeds: [{
                        color: 0xED4245,
                        title: '🚫 ОБЩИЕ ПРАВИЛА',
                        fields: [
                            {
                                name: '1️⃣ Уважение',
                                value: 'Уважайте всех участников сервера. Запрещены оскорбления, унижения, травля и дискриминация по любому признаку.'
                            },
                            {
                                name: '2️⃣ Спам и флуд',
                                value: 'Запрещен спам, флуд, бессмысленные сообщения и злоупотребление CAPS LOCK. Не отправляйте одно и то же сообщение несколько раз.'
                            },
                            {
                                name: '3️⃣ Реклама',
                                value: 'Запрещена реклама других серверов, Discord серверов, социальных сетей без разрешения администрации.'
                            },
                            {
                                name: '4️⃣ NSFW контент',
                                value: 'Строго запрещен контент 18+, порнография, gore и другой неприемлемый контент.'
                            },
                            {
                                name: '5️⃣ Личная информация',
                                value: 'Запрещено публиковать личную информацию других людей (доксинг). Будьте осторожны со своими данными.'
                            }
                        ]
                    }]
                });
                
                await rulesChannel.send({
                    embeds: [{
                        color: 0xFEE75C,
                        title: '🎮 ИГРОВЫЕ ПРАВИЛА',
                        fields: [
                            {
                                name: '6️⃣ Читы и баги',
                                value: 'Запрещено использование читов, модов дающих преимущество, и эксплуатация багов. О найденных багах сообщайте в канал 🐛-баг-репорты.'
                            },
                            {
                                name: '7️⃣ Гриферство',
                                value: 'Запрещено разрушение чужих построек, кража предметов и любые действия, мешающие игре других игроков.'
                            },
                            {
                                name: '8️⃣ Никнеймы',
                                value: 'Никнеймы должны быть адекватными. Запрещены оскорбительные, провокационные или неприемлемые имена.'
                            },
                            {
                                name: '9️⃣ Торговля',
                                value: 'Запрещена торговля игровыми предметами за реальные деньги. Внутриигровая торговля разрешена.'
                            }
                        ]
                    }]
                });
                
                await rulesChannel.send({
                    embeds: [{
                        color: 0x5865F2,
                        title: '🔊 ПРАВИЛА ГОЛОСОВЫХ КАНАЛОВ',
                        fields: [
                            {
                                name: '🔟 Поведение в войсе',
                                value: 'Не используйте звуковые эффекты, не кричите в микрофон, не включайте громкую музыку. Уважайте других участников.'
                            },
                            {
                                name: '1️⃣1️⃣ Запись',
                                value: 'Запись разговоров без согласия всех участников запрещена.'
                            }
                        ]
                    }]
                });
                
                await rulesChannel.send({
                    embeds: [{
                        color: 0x57F287,
                        title: '⚖️ НАКАЗАНИЯ',
                        description: 'За нарушение правил предусмотрены следующие наказания:',
                        fields: [
                            {
                                name: '⚠️ Предупреждение',
                                value: 'Выдается за мелкие нарушения. После 3 предупреждений - мут или бан.',
                                inline: true
                            },
                            {
                                name: '🔇 Мут',
                                value: 'Временное ограничение возможности писать сообщения.',
                                inline: true
                            },
                            {
                                name: '👢 Кик',
                                value: 'Удаление с сервера с возможностью вернуться.',
                                inline: true
                            },
                            {
                                name: '🔨 Бан',
                                value: 'Постоянное удаление с сервера за серьезные нарушения.',
                                inline: true
                            }
                        ],
                        footer: { text: 'Администрация оставляет за собой право изменять правила' }
                    }]
                });
                
                await rulesChannel.send({
                    embeds: [{
                        color: 0x00FF00,
                        title: '✅ ЗАКЛЮЧЕНИЕ',
                        description: 'Спасибо за прочтение правил! Соблюдайте их, и мы все вместе создадим дружелюбное и приятное сообщество.\n\n**Приятной игры!** 🎮',
                        footer: { text: 'По всем вопросам обращайтесь к администрации' }
                    }]
                });
                console.log('✅ Канал правил заполнен');
            }
            
            // Заполняем канал событий
            const eventsChannel = guild.channels.cache.find(ch => ch.name === '🎉-события');
            if (eventsChannel && createdChannels > 0) {
                await eventsChannel.send({
                    embeds: [{
                        color: 0xFEE75C,
                        title: '🎉 СОБЫТИЯ И МЕРОПРИЯТИЯ',
                        description: 'В этом канале публикуются анонсы всех событий, конкурсов и мероприятий на сервере!',
                        fields: [
                            {
                                name: '📅 Что здесь публикуется?',
                                value: '• Конкурсы и турниры\n• Праздничные события\n• Совместные проекты\n• Розыгрыши призов\n• Специальные ивенты'
                            },
                            {
                                name: '🏆 Награды',
                                value: 'За участие в событиях вы можете получить:\n• Игровые предметы\n• Особые роли\n• Привилегии на сервере\n• И многое другое!'
                            },
                            {
                                name: '🔔 Следите за обновлениями',
                                value: 'Включите уведомления для этого канала, чтобы не пропустить интересные события!'
                            }
                        ],
                        thumbnail: { url: 'https://i.imgur.com/AfFp7pu.png' },
                        footer: { text: 'Скоро здесь появятся первые события!' },
                        timestamp: new Date()
                    }]
                });
                console.log('✅ Канал событий заполнен');
            }
            
            // Формируем итоговое сообщение
            let resultMessage = '✅ **Проверка завершена!**\n\n';
            
            if (createdRoles > 0 || createdChannels > 0) {
                resultMessage += '**Создано:**\n';
                if (createdRoles > 0) resultMessage += `🎭 Ролей: ${createdRoles}\n`;
                if (createdChannels > 0) resultMessage += `📁 Каналов: ${createdChannels}\n`;
            }
            
            if (skippedRoles > 0 || skippedChannels > 0) {
                resultMessage += '\n**Уже существовало:**\n';
                if (skippedRoles > 0) resultMessage += `🎭 Ролей: ${skippedRoles}\n`;
                if (skippedChannels > 0) resultMessage += `📁 Каналов: ${skippedChannels}\n`;
            }
            
            if (createdRoles === 0 && createdChannels === 0) {
                resultMessage += '\n✨ Вся структура уже создана! Ничего не требуется добавлять.';
            } else {
                resultMessage += '\n✨ Недостающие элементы успешно добавлены!';
            }
            
            if (afkChannel) {
                resultMessage += '\n\n**AFK канал:** Установлен с таймаутом 5 минут (в нём нельзя говорить)';
            }
            
            await message.reply(resultMessage);
        } catch (error) {
            console.error('❌ Ошибка при создании каналов:', error);
            await message.reply('❌ Произошла ошибка при создании каналов. Проверьте права бота!');
        }
    }

    // Команда !fill - принудительное заполнение каналов контентом (даже если они уже существуют)
    if (message.content === '!fill' && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply('🔧 Заполняю каналы контентом...');
        const guild = message.guild;

        try {
            await fillChannels(guild);
            await message.reply('✅ Каналы успешно заполнены!');
        } catch (error) {
            console.error('❌ Ошибка при заполнении каналов:', error);
            await message.reply('❌ Произошла ошибка при заполнении каналов. Проверьте права бота!');
        }
    }

    // Команда !announce - отправка объявления в канал новостей
    if (message.content.startsWith('!announce') && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const announcement = message.content.slice(10).trim();
        if (!announcement) {
            return message.reply('❌ Использование: !announce <текст объявления>');
        }
        
        const newsChannel = message.guild.channels.cache.find(ch => ch.name.includes('новости'));
        if (newsChannel) {
            await newsChannel.send({
                content: `📢 **НОВОСТЬ**\n\n${announcement}\n\n*Опубликовано: <t:${Math.floor(Date.now() / 1000)}:F>*`
            });
            await message.reply('✅ Объявление опубликовано!');
        } else {
            await message.reply('❌ Канал новостей не найден!');
        }
    }

    // Команда !changelog - добавление записи в changelog
    if (message.content.startsWith('!changelog') && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const changelogText = message.content.slice(11).trim();
        if (!changelogText) {
            return message.reply('❌ Использование: !changelog <описание изменений>');
        }
        
        const changelogChannel = message.guild.channels.cache.find(ch => ch.name.includes('changelog'));
        if (changelogChannel) {
            await changelogChannel.send({
                content: `📝 **ОБНОВЛЕНИЕ**\n\n${changelogText}\n\n*Дата: <t:${Math.floor(Date.now() / 1000)}:F>*`
            });
            await message.reply('✅ Запись добавлена в changelog!');
        } else {
            await message.reply('❌ Канал changelog не найден!');
        }
    }

    // ========== КОМАНДЫ МОДЕРАЦИИ ==========

    // Команда !kick - кик пользователя
    if (message.content.startsWith('!kick')) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('❌ У вас нет прав для использования этой команды!');
        }
        
        const args = message.content.split(' ').slice(1);
        const member = message.mentions.members.first();
        
        if (!member) {
            return message.reply('❌ Использование: !kick @пользователь [причина]');
        }
        
        if (!member.kickable) {
            return message.reply('❌ Я не могу кикнуть этого пользователя! Проверьте иерархию ролей.');
        }
        
        const reason = args.slice(1).join(' ') || 'Причина не указана';
        
        try {
            // Отправляем ЛС пользователю
            await member.send(`⚠️ Вы были кикнуты с сервера **${message.guild.name}**\n**Причина:** ${reason}\n**Модератор:** ${message.author.tag}`).catch(() => {});
            
            await member.kick(reason);
            
            const kickEmbed = {
                color: 0xFF9900,
                title: '👢 Пользователь кикнут',
                fields: [
                    { name: 'Пользователь', value: `${member.user.tag} (${member.id})`, inline: true },
                    { name: 'Модератор', value: message.author.tag, inline: true },
                    { name: 'Причина', value: reason }
                ],
                timestamp: new Date()
            };
            
            await message.reply({ embeds: [kickEmbed] });
            
            // Отправляем лог в канал логов
            await sendLog(message.guild, kickEmbed);
            
            console.log(`👢 ${member.user.tag} кикнут модератором ${message.author.tag}`);
        } catch (error) {
            console.error('Ошибка при кике:', error);
            await message.reply('❌ Не удалось кикнуть пользователя!');
        }
    }

    // Команда !ban - бан пользователя
    if (message.content.startsWith('!ban')) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ У вас нет прав для использования этой команды!');
        }
        
        const args = message.content.split(' ').slice(1);
        const member = message.mentions.members.first();
        
        if (!member) {
            return message.reply('❌ Использование: !ban @пользователь [причина]');
        }
        
        if (!member.bannable) {
            return message.reply('❌ Я не могу забанить этого пользователя! Проверьте иерархию ролей.');
        }
        
        const reason = args.slice(1).join(' ') || 'Причина не указана';
        
        try {
            // Отправляем ЛС пользователю
            await member.send(`🔨 Вы были забанены на сервере **${message.guild.name}**\n**Причина:** ${reason}\n**Модератор:** ${message.author.tag}`).catch(() => {});
            
            await member.ban({ reason, deleteMessageSeconds: 86400 }); // Удаляет сообщения за последний день
            
            const banEmbed = {
                color: 0xFF0000,
                title: '🔨 Пользователь забанен',
                fields: [
                    { name: 'Пользователь', value: `${member.user.tag} (${member.id})`, inline: true },
                    { name: 'Модератор', value: message.author.tag, inline: true },
                    { name: 'Причина', value: reason }
                ],
                timestamp: new Date()
            };
            
            await message.reply({ embeds: [banEmbed] });
            
            // Отправляем лог в канал логов
            await sendLog(message.guild, banEmbed);
            
            console.log(`🔨 ${member.user.tag} забанен модератором ${message.author.tag}`);
        } catch (error) {
            console.error('Ошибка при бане:', error);
            await message.reply('❌ Не удалось забанить пользователя!');
        }
    }

    // Команда !unban - разбан пользователя
    if (message.content.startsWith('!unban')) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('❌ У вас нет прав для использования этой команды!');
        }
        
        const args = message.content.split(' ').slice(1);
        const userId = args[0];
        
        if (!userId) {
            return message.reply('❌ Использование: !unban <ID пользователя>');
        }
        
        try {
            await message.guild.members.unban(userId);
            await message.reply(`✅ Пользователь с ID ${userId} разбанен!`);
            console.log(`✅ Пользователь ${userId} разбанен модератором ${message.author.tag}`);
        } catch (error) {
            console.error('Ошибка при разбане:', error);
            await message.reply('❌ Не удалось разбанить пользователя! Проверьте ID.');
        }
    }

    // Команда !mute - мут пользователя
    if (message.content.startsWith('!mute')) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ У вас нет прав для использования этой команды!');
        }
        
        const args = message.content.split(' ').slice(1);
        const member = message.mentions.members.first();
        
        if (!member) {
            return message.reply('❌ Использование: !mute @пользователь <время> [причина]\nПример: !mute @User 10m Спам');
        }
        
        if (!member.moderatable) {
            return message.reply('❌ Я не могу замутить этого пользователя! Проверьте иерархию ролей.');
        }
        
        const timeArg = args[1];
        if (!timeArg) {
            return message.reply('❌ Укажите время мута! Примеры: 10m, 1h, 1d');
        }
        
        // Парсим время
        const timeRegex = /^(\d+)([smhd])$/;
        const match = timeArg.match(timeRegex);
        
        if (!match) {
            return message.reply('❌ Неверный формат времени! Используйте: s (секунды), m (минуты), h (часы), d (дни)\nПример: 10m');
        }
        
        const amount = parseInt(match[1]);
        const unit = match[2];
        
        let milliseconds;
        switch (unit) {
            case 's': milliseconds = amount * 1000; break;
            case 'm': milliseconds = amount * 60 * 1000; break;
            case 'h': milliseconds = amount * 60 * 60 * 1000; break;
            case 'd': milliseconds = amount * 24 * 60 * 60 * 1000; break;
        }
        
        // Максимум 28 дней (ограничение Discord)
        if (milliseconds > 28 * 24 * 60 * 60 * 1000) {
            return message.reply('❌ Максимальное время мута - 28 дней!');
        }
        
        const reason = args.slice(2).join(' ') || 'Причина не указана';
        
        try {
            await member.timeout(milliseconds, reason);
            
            // Отправляем ЛС пользователю
            await member.send(`🔇 Вы получили мут на сервере **${message.guild.name}**\n**Длительность:** ${timeArg}\n**Причина:** ${reason}\n**Модератор:** ${message.author.tag}`).catch(() => {});
            
            const muteEmbed = {
                color: 0xFFA500,
                title: '🔇 Пользователь замучен',
                fields: [
                    { name: 'Пользователь', value: `${member.user.tag} (${member.id})`, inline: true },
                    { name: 'Модератор', value: message.author.tag, inline: true },
                    { name: 'Длительность', value: timeArg, inline: true },
                    { name: 'Причина', value: reason }
                ],
                timestamp: new Date()
            };
            
            await message.reply({ embeds: [muteEmbed] });
            
            // Отправляем лог в канал логов
            await sendLog(message.guild, muteEmbed);
            
            console.log(`🔇 ${member.user.tag} замучен на ${timeArg} модератором ${message.author.tag}`);
        } catch (error) {
            console.error('Ошибка при муте:', error);
            await message.reply('❌ Не удалось замутить пользователя!');
        }
    }

    // Команда !unmute - размут пользователя
    if (message.content.startsWith('!unmute')) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ У вас нет прав для использования этой команды!');
        }
        
        const member = message.mentions.members.first();
        
        if (!member) {
            return message.reply('❌ Использование: !unmute @пользователь');
        }
        
        try {
            await member.timeout(null);
            await message.reply(`✅ Мут снят с пользователя ${member.user.tag}`);
            console.log(`✅ Мут снят с ${member.user.tag} модератором ${message.author.tag}`);
        } catch (error) {
            console.error('Ошибка при размуте:', error);
            await message.reply('❌ Не удалось снять мут!');
        }
    }

    // Команда !warn - предупреждение пользователю
    if (message.content.startsWith('!warn')) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ У вас нет прав для использования этой команды!');
        }
        
        const args = message.content.split(' ').slice(1);
        const member = message.mentions.members.first();
        
        if (!member) {
            return message.reply('❌ Использование: !warn @пользователь <причина>');
        }
        
        const reason = args.slice(1).join(' ') || 'Причина не указана';
        
        // Добавляем предупреждение
        if (!warnings.has(member.id)) {
            warnings.set(member.id, []);
        }
        
        const userWarnings = warnings.get(member.id);
        userWarnings.push({
            reason: reason,
            moderator: message.author.tag,
            date: new Date()
        });
        
        // Отправляем ЛС пользователю
        await member.send(`⚠️ Вы получили предупреждение на сервере **${message.guild.name}**\n**Причина:** ${reason}\n**Модератор:** ${message.author.tag}\n**Всего предупреждений:** ${userWarnings.length}`).catch(() => {});
        
        const warnEmbed = {
            color: 0xFFFF00,
            title: '⚠️ Предупреждение выдано',
            fields: [
                { name: 'Пользователь', value: `${member.user.tag} (${member.id})`, inline: true },
                { name: 'Модератор', value: message.author.tag, inline: true },
                { name: 'Всего предупреждений', value: userWarnings.length.toString(), inline: true },
                { name: 'Причина', value: reason }
            ],
            timestamp: new Date()
        };
        
        await message.reply({ embeds: [warnEmbed] });
        
        // Отправляем лог в канал логов
        await sendLog(message.guild, warnEmbed);
        
        console.log(`⚠️ ${member.user.tag} получил предупреждение от ${message.author.tag}`);
    }

    // Команда !warnings - просмотр предупреждений
    if (message.content.startsWith('!warnings')) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ У вас нет прав для использования этой команды!');
        }
        
        const member = message.mentions.members.first();
        
        if (!member) {
            return message.reply('❌ Использование: !warnings @пользователь');
        }
        
        const userWarnings = warnings.get(member.id) || [];
        
        if (userWarnings.length === 0) {
            return message.reply(`✅ У пользователя ${member.user.tag} нет предупреждений!`);
        }
        
        const warningsList = userWarnings.map((w, i) => 
            `**${i + 1}.** ${w.reason}\n*Модератор: ${w.moderator} | Дата: ${w.date.toLocaleString('ru-RU')}*`
        ).join('\n\n');
        
        const warningsEmbed = {
            color: 0xFFFF00,
            title: `⚠️ Предупреждения пользователя ${member.user.tag}`,
            description: warningsList,
            footer: { text: `Всего предупреждений: ${userWarnings.length}` },
            timestamp: new Date()
        };
        
        await message.reply({ embeds: [warningsEmbed] });
    }

    // Команда !clearwarns - очистить предупреждения
    if (message.content.startsWith('!clearwarns')) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ У вас нет прав для использования этой команды!');
        }
        
        const member = message.mentions.members.first();
        
        if (!member) {
            return message.reply('❌ Использование: !clearwarns @пользователь');
        }
        
        warnings.delete(member.id);
        await message.reply(`✅ Все предупреждения пользователя ${member.user.tag} очищены!`);
        console.log(`✅ Предупреждения ${member.user.tag} очищены администратором ${message.author.tag}`);
    }

    // Команда !clear - очистка сообщений
    if (message.content.startsWith('!clear')) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ У вас нет прав для использования этой команды!');
        }
        
        const args = message.content.split(' ');
        const amount = parseInt(args[1]);
        
        if (!amount || amount < 1 || amount > 100) {
            return message.reply('❌ Использование: !clear <количество>\nУкажите число от 1 до 100');
        }
        
        try {
            const deleted = await message.channel.bulkDelete(amount + 1, true); // +1 для удаления команды
            
            const reply = await message.channel.send(`🗑️ Удалено ${deleted.size - 1} сообщений!`);
            
            // Удаляем сообщение о результате через 3 секунды
            setTimeout(() => reply.delete().catch(() => {}), 3000);
            
            console.log(`🗑️ ${message.author.tag} удалил ${deleted.size - 1} сообщений в ${message.channel.name}`);
        } catch (error) {
            console.error('Ошибка при очистке сообщений:', error);
            await message.reply('❌ Не удалось удалить сообщения! (Можно удалять только сообщения младше 14 дней)');
        }
    }

    // ========== КОМАНДЫ УПРАВЛЕНИЯ РОЛЯМИ ==========

    // Команда !giverole - выдать роль пользователю
    if (message.content.startsWith('!giverole') && message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        const args = message.content.split(' ');
        if (args.length < 3) {
            return message.reply('❌ Использование: !giverole @пользователь @роль');
        }
        
        const member = message.mentions.members.first();
        const role = message.mentions.roles.first();
        
        if (!member || !role) {
            return message.reply('❌ Укажите пользователя и роль!');
        }
        
        try {
            await member.roles.add(role);
            await message.reply(`✅ Роль ${role.name} выдана пользователю ${member.user.tag}`);
        } catch (error) {
            await message.reply('❌ Не удалось выдать роль. Проверьте права бота!');
        }
    }

    // Команда !removerole - забрать роль у пользователя
    if (message.content.startsWith('!removerole') && message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        const args = message.content.split(' ');
        if (args.length < 3) {
            return message.reply('❌ Использование: !removerole @пользователь @роль');
        }
        
        const member = message.mentions.members.first();
        const role = message.mentions.roles.first();
        
        if (!member || !role) {
            return message.reply('❌ Укажите пользователя и роль!');
        }
        
        try {
            await member.roles.remove(role);
            await message.reply(`✅ Роль ${role.name} забрана у пользователя ${member.user.tag}`);
        } catch (error) {
            await message.reply('❌ Не удалось забрать роль. Проверьте права бота!');
        }
    }

    // Команда !help - список команд
    if (message.content === '!help') {
        const helpEmbed = {
            color: 0x0099ff,
            title: '🤖 Команды бота',
            description: 'Список доступных команд для управления ботом',
            fields: [
                {
                    name: '📋 Настройка',
                    value: '`!setup` - Создать структуру каналов и ролей'
                },
                {
                    name: '📢 Объявления',
                    value: '`!announce <текст>` - Опубликовать новость\n`!changelog <текст>` - Добавить запись в changelog'
                },
                {
                    name: '🛡️ Модерация',
                    value: '`!kick @user [причина]` - Кикнуть пользователя\n`!ban @user [причина]` - Забанить пользователя\n`!unban <ID>` - Разбанить пользователя\n`!mute @user <время> [причина]` - Замутить (10m, 1h, 1d)\n`!unmute @user` - Размутить\n`!warn @user <причина>` - Выдать предупреждение\n`!warnings @user` - Посмотреть предупреждения\n`!clearwarns @user` - Очистить предупреждения\n`!clear <число>` - Удалить сообщения (1-100)'
                },
                {
                    name: '🎭 Роли',
                    value: '`!giverole @user @роль` - Выдать роль\n`!removerole @user @роль` - Забрать роль'
                },
                {
                    name: 'ℹ️ Помощь',
                    value: '`!help` - Показать это сообщение'
                }
            ],
            timestamp: new Date(),
            footer: {
                text: 'Minecraft Server Bot | Используйте команды с правами модератора'
            }
        };
        
        await message.reply({ embeds: [helpEmbed] });
    }
});

// ========== СИСТЕМА ПРИВАТНЫХ КОМНАТ (С КНОПКАМИ) ==========

// 1. СОЗДАНИЕ И УДАЛЕНИЕ (VoiceStateUpdate)
client.on('voiceStateUpdate', async (oldState, newState) => {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    // --- ВХОД В ТРИГГЕР "🔒 Создать комнату" ---
    if (newState.channel && newState.channel.name === '🔒 Создать комнату') {
        const member = newState.member;
        const category = newState.channel.parent;

        try {
            // 1. Создаем голосовой канал
            const voiceChannel = await guild.channels.create({
                name: `🔒 ${member.displayName}`,
                type: ChannelType.GuildVoice,
                parent: category,
                userLimit: 5,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
                    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.ManageChannels] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.MoveMembers] }
                ]
            });

            // 2. Создаем текстовый канал для управления
            const textChannel = await guild.channels.create({
                name: `💬-управление-${member.id}`, // ID чтобы имена не конфликтовали
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ],
                topic: `Комната пользователя ${member.user.tag}`
            });

            // Сохраняем связь
            privateRooms.set(voiceChannel.id, { ownerId: member.id, textId: textChannel.id });

            // Перемещаем пользователя
            await member.voice.setChannel(voiceChannel);

            // Отправляем панель управления в текстовый канал
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('private_invite').setLabel('👥 Пригласить').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('private_kick').setLabel('🚫 Выгнать').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('private_rename').setLabel('✏️ Название').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('private_limit').setLabel('🔢 Лимит').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('private_close').setLabel('🗑️ Закрыть').setStyle(ButtonStyle.Danger)
            );

            await textChannel.send({
                content: `👋 Привет, **${member.displayName}**! Это панель управления твоей приватной комнатой.`,
                embeds: [{
                    color: 0x5865F2,
                    title: '🎛️ Панель управления',
                    description: 'Используй кнопки ниже для настройки комнаты.',
                    fields: [
                        { name: '👥 Пригласить', value: 'Откроет окно для выбора друга.' },
                        { name: '🚫 Выгнать', value: 'Откроет окно для кика участника.' },
                        { name: '✏️ Название', value: 'Изменить имя голосового канала.' },
                        { name: '🔢 Лимит', value: 'Изменить макс. кол-во людей (0-99).' },
                        { name: '🗑️ Закрыть', value: 'Удалить комнату навсегда.' }
                    ]
                }],
                components: [row]
            });

        } catch (err) {
            console.error('Ошибка создания приватной комнаты:', err);
        }
        return;
    }

    // --- ВЫХОД И УДАЛЕНИЕ ---
    if (oldState.channel && privateRooms.has(oldState.channel.id)) {
        const channelId = oldState.channel.id;
        const roomData = privateRooms.get(channelId);
        const channel = oldState.channel;

        // Если в канале никого не осталось
        if (channel.members.size === 0) {
            privateRooms.delete(channelId);
            
            // Удаляем голосовой канал
            await channel.delete().catch(() => {});
            
            // Удаляем текстовый канал
            if (roomData.textId) {
                const textCh = guild.channels.cache.get(roomData.textId);
                if (textCh) await textCh.delete().catch(() => {});
            }
        }
    }
});

// 2. ОБРАБОТКА КНОПОК (interactionCreate)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // Проверяем, что кнопка нажата в текстовом канале приватной комнаты
    if (!interaction.customId.startsWith('private_')) return;

    const memberId = interaction.user.id;
    const channel = interaction.channel;
    
    // Находим комнату по текстовому каналу
    let voiceChannelId = null;
    let roomData = null;

    for (const [vcId, data] of privateRooms.entries()) {
        if (data.textId === channel.id) {
            voiceChannelId = vcId;
            roomData = data;
            break;
        }
    }

    // Если не нашли по текстовому каналу, проверяем, находится ли юзер в приватном войсе
    if (!roomData) {
        const memberVoice = interaction.member.voice.channel;
        if (memberVoice && privateRooms.has(memberVoice.id)) {
            roomData = privateRooms.get(memberVoice.id);
            voiceChannelId = memberVoice.id;
            // Разрешаем управление только если это тот же текстовый канал, что привязан к войсу
            if (roomData.textId !== channel.id) {
                return interaction.reply({ content: '❌ Используй кнопки в соответствующем текстовом канале!', ephemeral: true });
            }
        } else {
            return interaction.reply({ content: '❌ Эта панель неактивна или комната уже удалена.', ephemeral: true });
        }
    }

    // Проверка прав владельца
    if (roomData.ownerId !== memberId) {
        return interaction.reply({ content: '❌ Только владелец комнаты может использовать эти кнопки!', ephemeral: true });
    }

    const voiceChannel = interaction.guild.channels.cache.get(voiceChannelId);
    if (!voiceChannel) {
        privateRooms.delete(voiceChannelId); // Чистка мусора
        return interaction.reply({ content: '❌ Голосовой канал не найден.', ephemeral: true });
    }

    // --- ЛОГИКА КНОПОК ---

    // 1. ПРИГЛАСИТЬ
    if (interaction.customId === 'private_invite') {
        const modal = new ModalBuilder()
            .setCustomId('modal_invite')
            .setTitle('Пригласить пользователя');
        
        const input = new TextInputBuilder()
            .setCustomId('invite_user_id')
            .setLabel('Упомяните пользователя (@User)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('@User')
            .setRequired(true);
        
        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);
        await interaction.showModal(modal);
    }

    // 2. ВЫГНАТЬ
    if (interaction.customId === 'private_kick') {
        const modal = new ModalBuilder()
            .setCustomId('modal_kick')
            .setTitle('Выгнать пользователя');
        
        const input = new TextInputBuilder()
            .setCustomId('kick_user_id')
            .setLabel('Упомяните пользователя (@User)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('@User')
            .setRequired(true);
        
        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);
        await interaction.showModal(modal);
    }

    // 3. ПЕРЕИМЕНОВАТЬ
    if (interaction.customId === 'private_rename') {
        const modal = new ModalBuilder()
            .setCustomId('modal_rename')
            .setTitle('Изменить название комнаты');
        
        const input = new TextInputBuilder()
            .setCustomId('rename_text')
            .setLabel('Новое название')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Например: Играем в CS2')
            .setMaxLength(30)
            .setRequired(true);
        
        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);
        await interaction.showModal(modal);
    }

    // 4. ЛИМИТ
    if (interaction.customId === 'private_limit') {
        const modal = new ModalBuilder()
            .setCustomId('modal_limit')
            .setTitle('Изменить лимит участников');
        
        const input = new TextInputBuilder()
            .setCustomId('limit_number')
            .setLabel('Число (0-99, 0 = безлим)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('5')
            .setRequired(true);
        
        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);
        await interaction.showModal(modal);
    }

    // 5. ЗАКРЫТЬ
    if (interaction.customId === 'private_close') {
        await interaction.reply({ content: '⚠️ Комната удаляется...', ephemeral: true });
        privateRooms.delete(voiceChannelId);
        await voiceChannel.delete().catch(() => {});
        const textCh = interaction.guild.channels.cache.get(roomData.textId);
        if (textCh) await textCh.delete().catch(() => {});
    }
});

// 3. ОБРАБОТКА МОДАЛЬНЫХ ОКОН (submit)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    const memberId = interaction.user.id;
    const channel = interaction.channel;
    
    // Ищем комнату по текстовому каналу
    let voiceChannelId = null;
    let roomData = null;
    for (const [vcId, data] of privateRooms.entries()) {
        if (data.textId === channel.id) {
            voiceChannelId = vcId;
            roomData = data;
            break;
        }
    }

    if (!roomData || roomData.ownerId !== memberId) {
        return interaction.reply({ content: '❌ Ошибка доступа.', ephemeral: true });
    }

    const voiceChannel = interaction.guild.channels.cache.get(voiceChannelId);
    if (!voiceChannel) return interaction.reply({ content: '❌ Канал не найден.', ephemeral: true });

    // --- ОБРАБОТКА ДАННЫХ ИЗ МОДАЛОК ---

    // ПРИГЛАШЕНИЕ
    if (interaction.customId === 'modal_invite') {
        const mention = interaction.fields.getTextInputValue('invite_user_id');
        const userMention = mention.match(/<@!?(\d+)>/);
        
        if (!userMention) {
            return interaction.reply({ content: '❌ Неверный формат. Используйте упоминание @User', ephemeral: true });
        }
        
        const targetId = userMention[1];
        try {
            await voiceChannel.permissionOverwrites.edit(targetId, {
                ViewChannel: true,
                Connect: true,
                Speak: true
            });
            await interaction.reply({ content: `✅ Пользователь <@${targetId}> добавлен!`, ephemeral: true });
        } catch (e) {
            await interaction.reply({ content: '❌ Не удалось выдать права.', ephemeral: true });
        }
    }

    // КИК
    if (interaction.customId === 'modal_kick') {
        const mention = interaction.fields.getTextInputValue('kick_user_id');
        const userMention = mention.match(/<@!?(\d+)>/);
        
        if (!userMention) {
            return interaction.reply({ content: '❌ Неверный формат. Используйте упоминание @User', ephemeral: true });
        }
        
        const targetId = userMention[1];
        const targetMember = interaction.guild.members.cache.get(targetId);
        
        try {
            // Снимаем права
            await voiceChannel.permissionOverwrites.edit(targetId, {
                ViewChannel: false,
                Connect: false
            });
            // Если он в войсе - diconnect
            if (targetMember && targetMember.voice.channelId === voiceChannelId) {
                await targetMember.voice.disconnect();
            }
            await interaction.reply({ content: `✅ Пользователь <@${targetId}> выгнан!`, ephemeral: true });
        } catch (e) {
            await interaction.reply({ content: '❌ Не удалось выгнать.', ephemeral: true });
        }
    }

    // ПЕРЕИМЕНОВАНИЕ
    if (interaction.customId === 'modal_rename') {
        const newName = interaction.fields.getTextInputValue('rename_text');
        try {
            await voiceChannel.setName(`🔒 ${newName}`);
            await interaction.reply({ content: `✅ Название изменено на: **${newName}**`, ephemeral: true });
        } catch (e) {
            await interaction.reply({ content: '❌ Ошибка при переименовании.', ephemeral: true });
        }
    }

    // ЛИМИТ
    if (interaction.customId === 'modal_limit') {
        const limitStr = interaction.fields.getTextInputValue('limit_number');
        const limit = parseInt(limitStr);
        
        if (isNaN(limit) || limit < 0 || limit > 99) {
            return interaction.reply({ content: '❌ Число должно быть от 0 до 99.', ephemeral: true });
        }
        
        try {
            await voiceChannel.setUserLimit(limit);
            await interaction.reply({ content: `✅ Лимит установлен: **${limit === 0 ? 'Безлим' : limit}**`, ephemeral: true });
        } catch (e) {
            await interaction.reply({ content: '❌ Ошибка при установке лимита.', ephemeral: true });
        }
    }
});

// Обработка ошибок
client.on('error', error => {
    console.error('❌ Ошибка клиента:', error);
});

process.on('unhandledRejection', error => {
    console.error('❌ Необработанная ошибка:', error);
});

// ========== KEEP-ALIVE ДЛЯ RENDER ==========
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🤖 Bot is online!');
});

app.listen(port, () => {
  console.log(`🌐 Keep-alive server running on port ${port}`);
});
// Запуск бота
client.login(process.env.DISCORD_TOKEN);